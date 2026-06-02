import { redirect } from "next/navigation";
import AdminPageFrame from "../components/admin/AdminPageFrame";
import ProductAdminPanel from "../components/admin/ProductAdminPanel";
import { getAdminSessionFromCookies } from "../lib/adminAuth";

export default async function AdminPage() {
  if (!(await getAdminSessionFromCookies())) {
    redirect("/admin/login");
  }

  return (
    <AdminPageFrame title="Панель администратора">
      <div className="w-full overflow-x-auto">
        <ProductAdminPanel />
      </div>
    </AdminPageFrame>
  );
}
