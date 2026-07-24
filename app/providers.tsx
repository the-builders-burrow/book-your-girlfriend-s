"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      publicLicenseKey={process.env.NEXT_PUBLIC_COPILOTKIT_LICENSE_KEY}
      credentials="include"
      onError={({ error }) => {
        console.error("[book-your-girlfriend-copilot]", error.message);
      }}
    >
      {children}
    </CopilotKit>
  );
}
