"""
Fine-tune a causal LM with LoRA adapters on domain-specific Q&A data.

Supports Apple Silicon (MPS), CUDA, and CPU.

Usage:
    cd backend
    source venv/bin/activate
    python training/train.py \
        --data_path data/train.jsonl \
        --base_model "microsoft/Phi-3-mini-4k-instruct" \
        --output_dir data/fine_tuned_model \
        --epochs 3

Recommended base models for medical/legal (small enough for local GPU):
    - microsoft/Phi-3-mini-4k-instruct  (3.8B, good quality, fast on MPS)
    - meta-llama/Llama-3.2-1B-Instruct  (1B, fastest)
    - mistralai/Mistral-7B-Instruct-v0.3 (7B, best quality, needs ~16GB VRAM)

After training, set in backend/.env:
    LLM_BACKEND=huggingface
    HF_MODEL_PATH=./data/fine_tuned_model
"""
import argparse
import json
import os

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    TrainingArguments,
)
from trl import SFTTrainer


def detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_jsonl(path: str) -> list[dict]:
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def format_prompt(record: dict) -> str:
    """Format as Alpaca instruct template."""
    instruction = record.get("instruction", "")
    input_text = record.get("input", "")
    output = record.get("output", "")
    if input_text:
        prompt = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Input:\n{input_text}\n\n"
            f"### Response:\n{output}"
        )
    else:
        prompt = (
            f"### Instruction:\n{instruction}\n\n"
            f"### Response:\n{output}"
        )
    return prompt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_path", default="data/train.jsonl")
    parser.add_argument("--base_model", default="microsoft/Phi-3-mini-4k-instruct")
    parser.add_argument("--output_dir", default="data/fine_tuned_model")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--grad_accum", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max_seq_len", type=int, default=1024)
    parser.add_argument("--lora_r", type=int, default=16)
    parser.add_argument("--lora_alpha", type=int, default=32)
    parser.add_argument("--lora_dropout", type=float, default=0.05)
    args = parser.parse_args()

    device = detect_device()
    print(f"Training on: {device.upper()}")

    # Load and format data
    records = load_jsonl(args.data_path)
    texts = [format_prompt(r) for r in records]
    dataset = Dataset.from_dict({"text": texts})
    split = dataset.train_test_split(test_size=0.1, seed=42)
    print(f"Train: {len(split['train'])} | Eval: {len(split['test'])}")

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Base model — load in float32 for MPS compatibility (no bfloat16 on MPS)
    dtype = torch.float16 if device == "cuda" else torch.float32
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        trust_remote_code=True,
        device_map=None,  # we move manually for MPS
    )
    if device in ("mps", "cpu"):
        model = model.to(device)

    # LoRA config
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        # Target common attention projection names
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        warmup_ratio=0.05,
        lr_scheduler_type="cosine",
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        report_to="none",
        # MPS/CPU-safe settings
        bf16=False,
        fp16=(device == "cuda"),
        use_cpu=(device == "cpu"),
        dataloader_pin_memory=(device == "cuda"),
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=args.max_seq_len,
        data_collator=DataCollatorForSeq2Seq(tokenizer, model=model, pad_to_multiple_of=8),
    )

    print("Starting training…")
    trainer.train()

    # Merge LoRA weights into base model and save
    print("Merging LoRA adapters and saving…")
    merged = model.merge_and_unload()
    merged.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"Model saved to {args.output_dir}")
    print(
        "\nNext step: set in backend/.env:\n"
        "  LLM_BACKEND=huggingface\n"
        f"  HF_MODEL_PATH={args.output_dir}"
    )


if __name__ == "__main__":
    main()
