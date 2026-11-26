"use client";

import clsx from "clsx";
import { period } from "@/lib/format";
import type { MasterCv, TailoredBullet, TailoredCv } from "@/lib/types";

type Content = TailoredCv["content"];

export function masterToContent(cv: MasterCv): Content {
  const bullets = (items: { id: string; text: string }[]): TailoredBullet[] =>
    items.map((b) => ({ source_id: b.id, text: b.text, rewritten: false }));
  return {
    full_name: cv.full_name,
    email: cv.email,
    phone: cv.phone,
    location: cv.location,
    links: cv.links,
    summary: cv.summary ? { text: cv.summary, source_ids: ["summary"] } : null,
    experience: cv.experience.map((e) => ({
      source_id: e.id,
      company: e.company,
      title: e.title,
      location: e.location,
      start: e.start,
      end: e.end,
      bullets: bullets(e.bullets),
    })),
    education: cv.education,
    projects: cv.projects.map((p) => ({
      source_id: p.id,
      name: p.name,
      description: p.description,
      technologies: p.technologies,
      bullets: bullets(p.bullets),
    })),
    skills: cv.skills.map((s) => ({ source_id: s.id, name: s.name })),
    certifications: cv.certifications,
    gaps: [],
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid-page">
      <h3 className="mb-2.5 border-b border-ink/70 pb-1 font-display text-[15px] font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Bullets({
  items,
  highlight,
  compare,
  originals,
}: {
  items: TailoredBullet[];
  highlight: boolean;
  compare: boolean;
  originals: Map<string, string> | null;
}) {
  return (
    <ul className="mt-1.5 space-y-1.5 pl-4 [&>li]:list-disc [&>li]:marker:text-ink-2">
      {items.map((bullet) => {
        const original = originals?.get(bullet.source_id);
        return (
          <li key={bullet.source_id} className="pl-1 text-[14.5px] leading-relaxed">
            <span className={clsx(highlight && bullet.rewritten && "chalk")}>{bullet.text}</span>
            {compare && bullet.rewritten && original && (
              <span className="mt-0.5 block text-[13px] text-mute">
                <span className="font-semibold">Your original:</span> {original}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CvSheet({
  content,
  highlight = false,
  compare = false,
  originals = null,
}: {
  content: Content;
  highlight?: boolean;
  compare?: boolean;
  originals?: Map<string, string> | null;
}) {
  const contact = [content.email, content.phone, content.location, ...content.links].filter(Boolean) as string[];

  return (
    <article className="print-area mx-auto max-w-[820px] rounded-[4px] border border-line bg-sheet px-6 py-8 shadow-[0_1px_0_var(--color-line),0_14px_30px_-18px_rgb(23_34_77/0.35)] md:px-12 md:py-11">
      <header>
        <h2 className="text-[30px] font-bold leading-tight">{content.full_name ?? "Your name"}</h2>
        {contact.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5 text-[13.5px] text-ink-2">
            {contact.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
        )}
      </header>

      {content.summary && (
        <Section title="Summary">
          <p className="text-[14.5px] leading-relaxed">
            <span className={clsx(highlight && content.summary.source_ids[0] !== "summary" && "chalk")}>
              {content.summary.text}
            </span>
          </p>
        </Section>
      )}

      {content.experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-5">
            {content.experience.map((job) => (
              <div key={job.source_id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="font-semibold">
                    {job.title}
                    <span className="font-normal text-ink-2"> at {job.company}</span>
                  </p>
                  <p className="text-[13px] text-mute">{period(job.start, job.end)}</p>
                </div>
                <Bullets items={job.bullets} highlight={highlight} compare={compare} originals={originals} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-5">
            {content.projects.map((project) => (
              <div key={project.source_id}>
                <p className="font-semibold">
                  {project.name}
                  {project.technologies.length > 0 && (
                    <span className="font-normal text-ink-2"> using {project.technologies.join(", ")}</span>
                  )}
                </p>
                {project.description && <p className="text-[14px] text-ink-2">{project.description}</p>}
                <Bullets items={project.bullets} highlight={highlight} compare={compare} originals={originals} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.education.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {content.education.map((edu) => (
              <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p>
                  <span className="font-semibold">{[edu.degree, edu.field].filter(Boolean).join(" in ")}</span>
                  <span className="text-ink-2">{edu.degree || edu.field ? ", " : ""}{edu.institution}</span>
                </p>
                <p className="text-[13px] text-mute">{period(edu.start, edu.end)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {content.skills.length > 0 && (
        <Section title="Skills">
          <p className="text-[14.5px] leading-relaxed">{content.skills.map((s) => s.name).join(", ")}</p>
        </Section>
      )}

      {content.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="space-y-0.5 text-[14.5px]">
            {content.certifications.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
