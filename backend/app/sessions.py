"""
sessions.py
In-memory conversation state. Each conversation_id maps to a list of
turn dicts that are threaded into future LLM calls for context.
"""
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

# { conversation_id: { "turns": [...], "created_at": ..., "last_sql": "..." } }
_STORE: Dict[str, Dict[str, Any]] = {}


def new_conversation() -> str:
    cid = str(uuid.uuid4())
    _STORE[cid] = {
        "turns": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_sql": None,
    }
    return cid


def get_conversation(cid: str) -> Optional[Dict[str, Any]]:
    return _STORE.get(cid)


def ensure_conversation(cid: Optional[str]) -> str:
    """Return existing cid or create a new one."""
    if cid and cid in _STORE:
        return cid
    return new_conversation()


def add_turn(cid: str, prompt: str, sql: str, result_summary: str = "") -> None:
    conv = _STORE.get(cid)
    if not conv:
        return
    conv["turns"].append({
        "prompt": prompt,
        "sql": sql,
        "result_summary": result_summary,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    conv["last_sql"] = sql


def get_history_for_prompt(cid: str, max_turns: int = 5) -> List[Dict[str, str]]:
    """
    Return last N turns formatted for inclusion in an LLM messages array.
    Returns list of {role, content} dicts.
    """
    conv = _STORE.get(cid)
    if not conv:
        return []

    messages = []
    turns = conv["turns"][-max_turns:]
    for turn in turns:
        messages.append({"role": "user", "content": turn["prompt"]})
        messages.append({
            "role": "assistant",
            "content": f"SQL: {turn['sql']}"
        })
    return messages


def get_last_sql(cid: str) -> Optional[str]:
    conv = _STORE.get(cid)
    return conv["last_sql"] if conv else None
