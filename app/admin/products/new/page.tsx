import AdminPageFrame from "../../../components/admin/AdminPageFrame";
import ProductEditorPage from "../../../components/admin/ProductEditorPage";

export default function AdminCreateProductPage() {
  return (
    <AdminPageFrame
      title="Новый товар"
      showLogout={false}
      actionHref="/admin"
      actionLabel="К каталогу"
      actionClassName="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
    >
      <ProductEditorPage mode="create" />
    </AdminPageFrame>
  );
}
