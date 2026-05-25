// app/components/header.tsx
import Link from 'next/link'
import { getUser } from '@/lib/auth/get-user'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutButton } from './sign-out-button'

export async function Header() {
  const user = await getUser()

  if (!user) return null  // En login no se renderiza

  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            Distinto
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/publicaciones"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Publicaciones
          </Link>
          <Link
            href="/grabaciones"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            🎬 Grabaciones
          </Link>
          <Link
            href="/habitos"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            🔥 Hábitos
          </Link>
          <Link
            href="/editor"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Editor
          </Link>
          <Link
            href="/historial"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Historial
          </Link>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Settings
          </Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs font-normal text-muted-foreground">
                  Conectado como
                </span>
                <span className="text-sm">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0 focus:bg-transparent">
              <SignOutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
