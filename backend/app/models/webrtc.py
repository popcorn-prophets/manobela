from enum import Enum
from typing import Optional

from pydantic import BaseModel


class MessageType(str, Enum):
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice-candidate"
    WELCOME = "welcome"
    ERROR = "error"


class SDPMessage(BaseModel):
    type: MessageType
    sdp: str
    sdpType: str  # "offer" or "answer"


class ICECandidatePayload(BaseModel):
    candidate: str
    sdpMid: Optional[str]
    sdpMLineIndex: Optional[int]


class ICECandidateMessage(BaseModel):
    type: MessageType
    candidate: ICECandidatePayload


class WelcomeMessage(BaseModel):
    type: MessageType
    client_id: str
    timestamp: str  # ISO 8601 UTC string


class ErrorMessage(BaseModel):
    type: MessageType
    message: str


SignalingMessage = SDPMessage | ICECandidateMessage | WelcomeMessage | ErrorMessage
