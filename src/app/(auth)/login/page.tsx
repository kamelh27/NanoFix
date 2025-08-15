"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginApi } from "@/services/api-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await loginApi(data.email, data.password);
      router.replace(from);
    } catch (e: any) {
      alert(e?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-sm border">
      <h1 className="text-xl font-semibold mb-1 text-blue-700">NanoFix</h1>
      <p className="text-sm text-slate-600 mb-6">Inicia sesión para continuar</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
            {...register("email")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            {...register("password")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>
        <button
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded-md py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          Entrar
        </button>
      </form>
      <p className="text-xs text-slate-600 mt-4">
        ¿No tienes cuenta? <Link className="text-blue-700 hover:underline" href="/register">Regístrate</Link>
      </p>
    </div>
  );
}
