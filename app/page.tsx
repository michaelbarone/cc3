import { redirect } from "next/navigation";

export default function Home() {
  // For now, always redirect to the login page
  // This will be updated later to check for authentication and redirect appropriately
  redirect("/login");

  // This won't be rendered, but is needed for TypeScript
  return null;
}
