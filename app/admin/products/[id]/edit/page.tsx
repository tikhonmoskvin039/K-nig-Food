import { redirect } from "next/navigation";
import AdminPageFrame from "../../../../components/admin/AdminPageFrame";
import ProductEditorPage from "../../../../components/admin/ProductEditorPage";
import { getAdminSessionFromCookies } from "../../../../lib/adminAuth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditProductPage({ params }: Props) {
  if (!(await getAdminSessionFromCookies())) {
    redirect("/admin/login");
  }

  const { id } = await params;

  return (
    <AdminPageFrame
      title="Редактирование товара"
      showLogout={false}
      actionHref="/admin"
      actionLabel="К каталогу"
      actionClassName="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
    >
      <ProductEditorPage mode="edit" productId={id} />
    </AdminPageFrame>
  );
}
