"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import MiniCart from "./MiniCart";
import { ReduxProvider } from "../providers";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppDispatch } from "../store/hooks";
import { reconcileCartWithCatalog } from "../store/slices/cartSlice";
import { toast } from "sonner";

interface MenuItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  menuItems: MenuItem[];
}

function CartBackgroundTasks() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isCancelled = false;

    const syncCart = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;

        const data = await res.json();
        if (!isCancelled && Array.isArray(data)) {
          dispatch(reconcileCartWithCatalog(data as DTProduct[]));
        }
      } catch (error) {
        console.error("Cart sync failed:", error);
      }
    };

    syncCart();
    const intervalId = setInterval(syncCart, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [dispatch]);

  useEffect(() => {
    const noticeKey = "cart_auto_cleared_notice_v1";
    const rawNotice = localStorage.getItem(noticeKey);

    if (!rawNotice) return;

    localStorage.removeItem(noticeKey);
    toast.warning("Корзина очищена автоматически (раз в 24 часа).");
  }, []);

  return null;
}

const MobileMenu = ({ menuItems }: MobileMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pathname = usePathname();
  const { data: session } = useSession();

  const isCartOrCheckoutPage = pathname === "/cart" || pathname === "/checkout";

  return (
    <ReduxProvider>
      <CartBackgroundTasks />

      <div className="flex items-center gap-4 md:hidden">
        <button
          className="text-gray-900 hover:text-amber-700 transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {!isCartOrCheckoutPage && <MiniCart />}
      </div>

      <nav
        className={`absolute md:static top-[68px] left-0 w-full md:w-auto bg-white/95 md:bg-transparent border-b border-slate-200 md:border-0 md:flex flex-col md:flex-row items-start md:items-center p-4 md:p-0 transition-all shadow-sm md:shadow-none backdrop-blur ${
          isMenuOpen ? "block" : "hidden"
        }`}
      >
        {menuItems.map(({ label, href }) => {
          let finalHref = href;

          // если это пункт "Сотрудникам"
          if (href === "/admin/login") {
            finalHref = session ? "/admin" : "/admin/login";
            label = session ? "Администраторам" : "Сотрудникам";
          }

          return (
            <Link
              key={label}
              href={finalHref}
              className={`px-3 py-2 block text-sm md:text-base rounded-md ${
                session && label == "Администраторам"
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                  : "text-gray-900 hover:text-amber-700 hover:bg-amber-50/70 md:hover:bg-transparent"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
            </Link>
          );
        })}

        {!isCartOrCheckoutPage && (
          <div className="hidden md:flex md:ml-4">
            <MiniCart />
          </div>
        )}
      </nav>
    </ReduxProvider>
  );
};

export default MobileMenu;
