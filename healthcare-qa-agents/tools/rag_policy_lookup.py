# Healthcare QA Agents - RAG Policy Lookup Tool
# Purpose: Retrieve healthcare compliance policy sections using semantic similarity and keywords.

import json
import math
import os
import re
from typing import Any, Dict, List, Optional
from models.schemas import PolicyMatch


DEFAULT_POLICY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "policies.json"
)


def load_policies(filepath: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load policy definitions from the embedded JSON corpus.

    Args:
        filepath: Optional path to policies.json file.

    Returns:
        List of raw policy dictionaries.
    """
    target_path = filepath or DEFAULT_POLICY_PATH
    if not os.path.exists(target_path):
        return []
    with open(target_path, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_text_similarity(query: str, document_text: str, keywords: List[str]) -> float:
    """Compute lexical and keyword similarity score between query and policy.

    Args:
        query: Query string describing the failure or triage output.
        document_text: Combined title, description, and regulation text of the policy.
        keywords: Curated keywords associated with the policy section.

    Returns:
        Similarity score float between 0.0 and 1.0.
    """
    clean_query = set(re.findall(r"\b[a-z0-9\-]{3,}\b", query.lower()))
    clean_doc = set(re.findall(r"\b[a-z0-9\-]{3,}\b", document_text.lower()))

    if not clean_query or not clean_doc:
        return 0.0

    overlap = len(clean_query.intersection(clean_doc))
    keyword_hits = sum(1 for kw in keywords if kw.lower() in query.lower())

    jaccard = overlap / math.sqrt(len(clean_query) * len(clean_doc))
    score = (0.5 * jaccard) + (0.5 * min(keyword_hits / max(len(keywords), 1), 1.0))
    return round(min(max(score, 0.0), 1.0), 3)


def lookup_policies(
    query_text: str,
    top_k: int = 3,
    min_score: float = 0.15,
    policy_path: Optional[str] = None
) -> List[PolicyMatch]:
    """Retrieve top-matching healthcare policies against a query string.

    Args:
        query_text: Diagnostic text, error summary, or category.
        top_k: Maximum number of policy matches to return.
        min_score: Minimum similarity score threshold for inclusion.
        policy_path: Optional custom path to policies.json.

    Returns:
        List of PolicyMatch models sorted by descending similarity score.
    """
    corpus = load_policies(policy_path)
    matches: List[PolicyMatch] = []

    for item in corpus:
        doc_str = f"{item.get('title', '')} {item.get('regulation', '')} {item.get('description', '')}"
        keywords = item.get("keywords", [])
        sim = compute_text_similarity(query_text, doc_str, keywords)

        if sim >= min_score:
            matches.append(
                PolicyMatch(
                    policy_id=item.get("id", "UNKNOWN"),
                    title=item.get("title", "Untitled Policy"),
                    regulation=item.get("regulation", "Healthcare Standard"),
                    section=item.get("section", "N/A"),
                    similarity_score=sim,
                    remediation_hint=item.get("remediation", "Review system implementation for compliance.")
                )
            )

    matches.sort(key=lambda m: m.similarity_score, reverse=True)
    return matches[:top_k]
