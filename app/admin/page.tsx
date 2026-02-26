import AdminPageFrame from "../components/admin/AdminPageFrame";
import ProductAdminPanel from "../components/admin/ProductAdminPanel";

export default function AdminPage() {
  return (
    <AdminPageFrame title="Панель администратора">
      <div className="w-full overflow-x-auto">
        <ProductAdminPanel />
      </div>
    </AdminPageFrame>
  );
}
