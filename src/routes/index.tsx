import { createFileRoute } from "@tanstack/react-router";
import { AegisConsole } from "@/components/aegis-console";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AegisConsole />;
}
