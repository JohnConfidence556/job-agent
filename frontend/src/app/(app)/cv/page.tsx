"use client";

import { useState } from "react";
import { CvSheet, masterToContent } from "@/components/cv-sheet";
import { CvUpload } from "@/components/cv-upload";
import { Button, EmptyState, ErrorNote, PageHeader, Spinner } from "@/components/ui";
import { useMasterCv } from "@/lib/hooks";

export default function CvPage() {
  const cv = useMasterCv();
  const [replacing, setReplacing] = useState(false);

  return (
    <>
      <PageHeader
        title="My CV"
        actions={
          cv.data && !replacing ? (
            <Button variant="secondary" onClick={() => setReplacing(true)}>
              Replace CV
            </Button>
          ) : undefined
        }
      >
        This is your master CV. Every tailored CV is built from it, so check that it is complete and correct.
      </PageHeader>

      {cv.isLoading && <Spinner label="Loading your CV" />}
      {cv.isError && <ErrorNote message={cv.error.message} onRetry={() => cv.refetch()} />}

      {cv.data === null && (
        <div className="max-w-xl">
          <EmptyState title="No CV yet">Upload your CV so the agent can match and tailor jobs for you.</EmptyState>
          <div className="mt-6">
            <CvUpload />
          </div>
        </div>
      )}

      {replacing && (
        <div className="mb-8 max-w-xl">
          <CvUpload compact onDone={() => setReplacing(false)} />
          <Button variant="quiet" className="mt-3" onClick={() => setReplacing(false)}>
            Cancel
          </Button>
        </div>
      )}

      {cv.data && <CvSheet content={masterToContent(cv.data)} />}
    </>
  );
}
