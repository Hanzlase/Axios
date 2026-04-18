from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
import structlog

from services.ingestion_service import (
    create_payload,
    get_ingestion_store,
    process_upload_batch,
)
from utils.file_utils import is_supported_extension

router = APIRouter(tags=["ingestion"])
logger = structlog.get_logger()


@router.post("/upload", status_code=202)
async def upload_files(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    session_id: str | None = Form(default=None),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    normalized_session_id = (session_id or "").strip() or uuid4().hex
    store = get_ingestion_store()

    accepted_payloads = []
    accepted_records = []
    rejected_files = []

    for upload in files:
        filename = upload.filename or "unnamed"
        if not is_supported_extension(filename):
            rejected_files.append(
                {
                    "filename": filename,
                    "reason": "Unsupported format. Use PDF, DOCX, TXT, or CSV.",
                }
            )
            continue

        content = await upload.read()
        payload = create_payload(
            session_id=normalized_session_id,
            filename=filename,
            content=content,
        )
        accepted_payloads.append(payload)
        accepted_records.append(
            store.create_file_record(
                file_id=payload.file_id,
                session_id=payload.session_id,
                filename=payload.filename,
                extension=payload.extension,
                upload_time=payload.upload_time,
                size_bytes=len(payload.content),
            )
        )

    if accepted_payloads:
        background_tasks.add_task(process_upload_batch, accepted_payloads)

    logger.info(
        "upload_received",
        session_id=normalized_session_id,
        accepted_count=len(accepted_payloads),
        rejected_count=len(rejected_files),
    )

    if not accepted_payloads and rejected_files:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No supported files were uploaded",
                "rejected_files": rejected_files,
            },
        )

    return {
        "status": "accepted",
        "session_id": normalized_session_id,
        "accepted_count": len(accepted_payloads),
        "rejected_count": len(rejected_files),
        "files": accepted_records,
        "rejected_files": rejected_files,
    }


@router.get("/api/uploads/{session_id}")
async def get_uploads(session_id: str):
    store = get_ingestion_store()
    files = store.get_session_files(session_id)
    return {
        "session_id": session_id,
        "count": len(files),
        "files": files,
    }

