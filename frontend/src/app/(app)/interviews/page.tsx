import { EmptyState, LinkButton, PageHeader } from "@/components/ui";

export default function InterviewsPage() {
  return (
    <>
      <PageHeader title="Interviews">Practice for a real job, then see how you did.</PageHeader>
      <EmptyState title="Voice interviews are not ready yet" action={<LinkButton href="/jobs">Browse jobs</LinkButton>}>
        When they are, you will open a job, choose Interview, and answer questions out loud in a mock interview for
        that exact role. Your past interviews and feedback will be listed here.
      </EmptyState>
    </>
  );
}
