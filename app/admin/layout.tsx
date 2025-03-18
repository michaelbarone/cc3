import { ReactNode } from "react";
import { AdminLayoutClient } from "./components/AdminLayoutClient";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
