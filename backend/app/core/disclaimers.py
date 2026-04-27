MEDICAL_DISCLAIMER = (
    "This information is provided for informational purposes only and is not a substitute "
    "for professional medical advice, diagnosis, or treatment. Always seek the advice of "
    "your physician or other qualified health provider with any questions you may have "
    "regarding a medical condition."
)

LEGAL_DISCLAIMER = (
    "This information is provided for general informational purposes only and does not "
    "constitute legal advice. You should consult a licensed attorney for advice regarding "
    "your specific situation. No attorney-client relationship is created by use of this system."
)

GENERAL_DISCLAIMER = (
    "This answer is generated from the provided documents only. Always verify critical "
    "information with authoritative sources before acting on it."
)

DISCLAIMER_MAP: dict[str, str] = {
    "medical": MEDICAL_DISCLAIMER,
    "legal": LEGAL_DISCLAIMER,
    "general": GENERAL_DISCLAIMER,
}
