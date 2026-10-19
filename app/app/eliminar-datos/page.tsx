import Link from "next/link";
import { SiteFrame } from "@/components/sitio/site-frame";
import s from "@/components/sitio/sitio.module.css";

export const metadata = { title: "Eliminar mis datos — Distinto", description: "Cómo desconectar tu cuenta de TikTok, Facebook o Instagram de Distinto y solicitar la eliminación de tus datos." };

export default function Page() {
  return (
    <SiteFrame active="eliminar-datos">
      <section className={s.pageHead}>
        <div className={s.wrap}>
          <span className={s.kicker}>Tus datos</span>
          <h1 className={`${s.h1} ${s.display}`}>Desconectar tu cuenta y <em>eliminar tus datos</em></h1>
          <p className={s.lead}>Puedes retirar el acceso de Distinto a tus cuentas en cualquier momento y pedir que eliminemos la información asociada.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 76 }}>
        <div className={`${s.wrap} ${s.prose}`}>
          <h2 className={s.display}>Opción 1 · Desde TikTok</h2>
          <p>En la app de TikTok: <b>Perfil → Menú (☰) → Ajustes y privacidad → Seguridad y permisos → Aplicaciones y servicios</b> (o “Administrar permisos de aplicaciones”), elige <b>Distinto Studio</b> y toca <b>Eliminar acceso</b>.</p>
          <h2 className={s.display}>Opción 2 · Desde Facebook o Instagram</h2>
          <p>En Facebook: <b>Configuración y privacidad → Configuración → Integraciones comerciales</b> (o “Apps y sitios web”), elige nuestra aplicación y toca <b>Eliminar</b>.</p>
          <h2 className={s.display}>Opción 3 · Escríbenos</h2>
          <p>Envía un correo a <a href="mailto:team@distintostudio.com?subject=Eliminar%20mis%20datos">team@distintostudio.com</a> con el asunto <b>“Eliminar mis datos”</b>, indicando la marca y la cuenta (por ejemplo, el @usuario de TikTok).</p>
          <div className={s.note}>
            <p><b>¿Qué pasa después?</b> Eliminamos de inmediato las credenciales de acceso de la cuenta desconectada y, en un plazo máximo de 30 días, las métricas y reportes asociados, salvo la información que la ley nos obligue a conservar. Te confirmaremos por correo cuando se haya completado.</p>
          </div>
          <p>También puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición según la Ley N.° 29733. Más información en la <Link href="/privacidad/">Política de privacidad</Link>.</p>
          <p style={{ color: "#5a5466", fontSize: 14 }}>Distinto Agencia S.A.C. · RUC 20614387930 · Lima, Perú</p>
        </div>
      </section>
    </SiteFrame>
  );
}
