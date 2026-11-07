"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buildPacketAction, fillInForm, moveApplication, undoMove, type FillState, type PacketState } from "@/app/applications/actions";
import { canMove, hasBeenSent, isEndStage, nextStage, STAGE_LABELS, type Stage } from "@/lib/stages";
import { keepFields } from "./keep-fields";

type Props = { id: number; stage: Stage; hasPacket: boolean; hasDescription: boolean; url: string | null; contactReady: boolean; noFill?: boolean };

function MoveButton({ id, to, primary = false }: { id: number; to: Stage; primary?: boolean }) {
  return (
    <form action={moveApplication.bind(null, id)}>
      <input type="hidden" name="to" value={to} />
      <button className={primary ? "button" : "button button-quiet"}>Mark as {STAGE_LABELS[to].toLowerCase()}</button>
    </form>
  );
}

export function ApplicationActions({ id, stage, hasPacket, hasDescription, url, contactReady, noFill = false }: Props) {
  const [packet, writeAction, writing] = useActionState<PacketState, FormData>(buildPacketAction.bind(null, id), {});
  const [fill, fillAction, opening] = useActionState<FillState, FormData>(fillInForm.bind(null, id), {});

  if (isEndStage(stage)) {
    return (
      <div className="actions row-actions">
        <form action={undoMove.bind(null, id)}><button className="button button-quiet">Undo last move</button></form>
      </div>
    );
  }

  const sent = hasBeenSent(stage);
  const link = url && /^https?:\/\//i.test(url) ? url : null;
  const canFill = hasPacket && Boolean(url) && !noFill;
  const next = nextStage(stage);
  return (
    <>
      <div className="actions row-actions">
        {!sent && !hasPacket && !contactReady && <Link className="button" href="/contact">Check contact details first</Link>}
        {!sent && !hasPacket && contactReady && !hasDescription && <Link className="button" href={`/applications/${id}`}>Add the job description</Link>}
        {!sent && !hasPacket && contactReady && hasDescription && (
          <form onSubmit={keepFields(writeAction)}>
            <button className="button button-primary" disabled={writing}>{writing ? "Writing, a minute or two…" : "Write CV and answers"}</button>
          </form>
        )}
        {!sent && canFill && (
          <form onSubmit={keepFields(fillAction)}>
            <button className="button button-primary" disabled={opening}>{opening ? "Opening Terminal…" : "Fill in the form"}</button>
          </form>
        )}
        {!sent && link && <a className="button" href={link} target="_blank" rel="noreferrer">Open the form</a>}
        {hasPacket && <a className="button" href={`/applications/${id}/cv`} target="_blank" rel="noreferrer">Open CV</a>}
        {!sent && hasPacket && (
          <form onSubmit={keepFields(writeAction)}>
            <button className="button button-quiet" disabled={writing}>{writing ? "Writing, a minute or two…" : "Write it again"}</button>
          </form>
        )}
        {next && <MoveButton id={id} to={next} primary={sent} />}
        {sent && canMove(stage, "rejected") && <MoveButton id={id} to="rejected" />}
        {!sent && <MoveButton id={id} to="withdrawn" />}
      </div>
      {fill.opened && <p className="row-note" role="status">Opened in Terminal. Check every field there before you press Submit.</p>}
      {fill.error && <p className="error" role="alert">{fill.error}</p>}
      {packet.error && <p className="error" role="alert">{packet.error}</p>}
    </>
  );
}
