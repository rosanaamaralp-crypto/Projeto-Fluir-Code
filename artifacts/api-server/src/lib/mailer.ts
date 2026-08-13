/**
 * T-003 (F17.3) — Abstração mínima de envio de e-mail, configurável por ambiente.
 *
 * Drivers (selecionado automaticamente, sobrescritível via MAIL_DRIVER):
 * - "replitmail": usa o serviço de e-mail integrado do Replit
 *   (https://connectors.replit.com/api/v2/mailer/send). Disponível quando o
 *   processo roda no Replit: em desenvolvimento via REPL_IDENTITY e em
 *   deployment via WEB_REPL_RENEWAL — nenhum secret adicional necessário.
 * - "console": loga o e-mail no stdout (fallback de desenvolvimento/testes).
 *
 * Variáveis/secrets para produção:
 * - Em deployment no Replit: NENHUM secret adicional (WEB_REPL_RENEWAL é
 *   injetado pela plataforma automaticamente).
 * - Fora do Replit: seria necessário implementar um driver SMTP próprio;
 *   documentado como limitação conhecida.
 * - Opcional: MAIL_DRIVER=console força o driver de log (útil em testes).
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getReplitAuthToken(): string | null {
  if (process.env["REPL_IDENTITY"]) return `repl ${process.env["REPL_IDENTITY"]}`;
  if (process.env["WEB_REPL_RENEWAL"]) return `depl ${process.env["WEB_REPL_RENEWAL"]}`;
  return null;
}

function resolveDriver(): "replitmail" | "console" {
  const forced = process.env["MAIL_DRIVER"];
  if (forced === "console") return "console";
  if (forced === "replitmail") return "replitmail";
  return getReplitAuthToken() ? "replitmail" : "console";
}

async function sendViaReplitMail(message: MailMessage): Promise<void> {
  const token = getReplitAuthToken();
  if (!token) {
    throw new Error("Replit mail indisponível: nenhum token de autenticação (REPL_IDENTITY/WEB_REPL_RENEWAL).");
  }
  const response = await fetch("https://connectors.replit.com/api/v2/mailer/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X_REPLIT_TOKEN": token,
    },
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha no envio de e-mail (${response.status}): ${body.slice(0, 300)}`);
  }
}

/** Envia um e-mail usando o driver configurado. Lança em caso de falha. */
export async function sendMail(message: MailMessage): Promise<void> {
  const driver = resolveDriver();
  if (driver === "replitmail") {
    await sendViaReplitMail(message);
    return;
  }
  // Driver console — desenvolvimento/testes
  // eslint-disable-next-line no-console
  console.log(
    `[mailer:console] to=${message.to} subject="${message.subject}"\n${message.text}`,
  );
}
