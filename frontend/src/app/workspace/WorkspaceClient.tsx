"use client";

import dynamic from "next/dynamic";

const WorkspaceShell = dynamic(
  () =>
    import("@/components/workspace/WorkspaceShell").then((m) => m.WorkspaceShell),
  { ssr: false },
);

export default function WorkspaceClient() {
  return <WorkspaceShell />;
}
