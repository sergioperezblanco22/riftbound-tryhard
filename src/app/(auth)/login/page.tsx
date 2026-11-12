import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectParam = params.redirect;
  const redirectTo =
    typeof redirectParam === "string" ? redirectParam : undefined;

  return <LoginForm redirectTo={redirectTo} />;
}
