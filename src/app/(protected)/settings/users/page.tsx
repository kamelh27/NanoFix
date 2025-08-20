"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminCreateUserApi } from "@/services/api-auth";

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function UsersSettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const user = await adminCreateUserApi(data.name, data.email, data.password);
      alert(`Usuario creado: ${user.name} (${user.email})`);
      reset({ name: "", email: "", password: "" });
    } catch (e: any) {
      alert(e?.message || "No se pudo crear el usuario");
    }
  };

  return (
    <div className="max-w-lg bg-white rounded-xl border shadow-sm p-6">
      <h1 className="text-xl font-semibold mb-1">Usuarios</h1>
      <p className="text-sm text-slate-600 mb-6">
        Crea cuentas de técnicos. Los nuevos usuarios se registran con el rol <span className="font-medium">técnico</span>.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input
            type="text"
            placeholder="Nombre del técnico"
            {...register("name")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.name && (
            <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
          <input
            type="email"
            placeholder="tecnico@tienda.com"
            {...register("email")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            {...register("password")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>
        <button
          disabled={isSubmitting}
          className="inline-flex items-center justify-center bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
}
