"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buildPacketAction, fillInForm, startVoiceInterview, type FillState, type PacketState } from "@/app/applications/actions";
import type { Packet } from "@/lib/packets/build";
import { keepFields } from "./keep-fields";

type Props = { applicationId: number; packet?: Packet; hasDescription: boolean; hasLink: boolean; contactReady: boolean; hasVoice: boolean };

export function PacketSection({ applicationId, packet, hasDescription, hasLink, contactReady, hasVoice }: Props) {
  const [state, action, pending] = useActionState<PacketState, FormData>(buildPacketAction.bind(null, applicationId), {});
  const [fill, fillAction, opening] = useActionState<FillState, FormData>(fillInForm.bind(null, applicationId), {});
  const [voice, voiceAction, startingVoice] = useActionState<FillState, FormData>(startVoiceInterview, {});
  const draft = packet?.draft;
  return (
    <section className="section" aria-labelledby="packet-heading">
      <h2 id="packet-heading">Application packet</h2>
      {!contactReady && <p className="review-box">The CV needs your contact details. <Link href="/contact">Check them first</Link></p>}
      {!hasDescription && <p className="review-box">This job has no description to tailor to. Add it under Fix the details, below.</p>}
      <form onSubmit={keepFields(action)} className="check-form">
        <button className={packet ? "button" : "button button-primary"} disabled={pending || !contactReady || !hasDescription}>
          {pending ? "Writing, this takes a minute or two…" : packet ? "Write it again" : "Write CV and answers"}
        </button>
        {packet && <a href={`/applications/${applicationId}/cv`} target="_blank" rel="noreferrer">Open the CV (PDF)</a>}
      </form>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {!hasVoice && (
        <form onSubmit={keepFields(voiceAction)} className="check-form fill-form">
          <button className="button button-quiet voice-button" disabled={startingVoice}>{startingVoice ? "Opening Terminal…" : "Make these sound more like me"}</button>
          <span className="row-note">A five-minute interview, once, so everything written from then on uses your words and stories.</span>
        </form>
      )}
      {voice.opened && <p className="row-note" role="status">Opened in Terminal. When it&apos;s done, press &ldquo;Write it again&rdquo; here.</p>}
      {voice.error && <p className="error" role="alert">{voice.error}</p>}

      {packet && draft && (
        <>
          {packet.removed.length > 0 && (
            <div className="packet-part">
              <h3>Removed because your record doesn&apos;t support them</h3>
              <ul>
                {packet.removed.map((item, index) => (
                  <li key={index}>{item.where}: {item.text} <span className="source-list">({item.reason})</span></li>
                ))}
              </ul>
            </div>
          )}
          {packet.warnings.length > 0 && (
            <div className="packet-part">
              <h3>Check these before sending</h3>
              <ul>{packet.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            </div>
          )}
          {draft.gaps.length > 0 && (
            <div className="packet-part">
              <h3>What the job asks for that your record doesn&apos;t show</h3>
              <ul>{draft.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul>
            </div>
          )}
          {draft.coverNote.length > 0 && (
            <div className="packet-part">
              <h3>Cover note</h3>
              {draft.coverNote.map((item, index) => <p className="packet-text" key={index}>{item.text}</p>)}
            </div>
          )}
          {draft.answers.length > 0 && (
            <div className="packet-part">
              <h3>Answers to form questions</h3>
              {draft.answers.map((item, index) => (
                <div key={index}>
                  <p className="answer-question">{item.question}</p>
                  <p className="packet-text">{item.answer.text}</p>
                </div>
              ))}
            </div>
          )}
          {hasLink && (
            <div className="packet-part">
              <h3>Fill in the form</h3>
              <p className="packet-text">Jobless opens a Terminal window and fills in the form in your Chrome, stopping before Submit. Talk to it in that window, check every field, and press Submit yourself.</p>
              <form onSubmit={keepFields(fillAction)} className="check-form fill-form">
                <button className="button button-primary" disabled={opening}>{opening ? "Opening Terminal…" : "Fill in the form"}</button>
                {fill.opened && <p className="row-note" role="status">Opened in Terminal.</p>}
              </form>
              {fill.error && <p className="error" role="alert">{fill.error}</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
