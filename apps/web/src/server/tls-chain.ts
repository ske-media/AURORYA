// Lecture de la chaîne de certificats présentée par un serveur Postgres, pour épingler son autorité racine
// (DATABASE_CA_CERT). La vérification est désactivée pour cette seule lecture : aucune donnée ni aucun
// identifiant ne transite sur cette connexion, qui est fermée aussitôt.
import { createHash } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';

export type ChainEntry = { subject: string; issuer: string; sha256: string; validTo: string; selfSigned: boolean; pem: string };

const toPem = (der: Buffer): string => `-----BEGIN CERTIFICATE-----\n${(der.toString('base64').match(/.{1,64}/g) ?? []).join('\n')}\n-----END CERTIFICATE-----\n`;

export function readPostgresTlsChain(host: string, port: number, timeoutMs = 8000): Promise<ChainEntry[]> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const fail = (error: Error): void => { socket.destroy(); reject(error); };
    socket.setTimeout(timeoutMs, () => fail(new Error('délai dépassé')));
    socket.once('error', fail);
    socket.once('connect', () => {
      // SSLRequest du protocole Postgres : longueur 8, code 80877103.
      const request = Buffer.alloc(8);
      request.writeUInt32BE(8, 0);
      request.writeUInt32BE(80877103, 4);
      socket.write(request);
    });
    socket.once('data', (answer) => {
      if (answer.toString('latin1', 0, 1) !== 'S') return fail(new Error('le serveur refuse TLS'));
      const secure = tls.connect({ socket, servername: host, rejectUnauthorized: false }, () => {
        const chain: ChainEntry[] = [];
        const seen = new Set<string>();
        let cert: tls.DetailedPeerCertificate | undefined = secure.getPeerCertificate(true);
        while (cert?.raw && !seen.has(cert.fingerprint256)) {
          seen.add(cert.fingerprint256);
          const subject = String(cert.subject?.CN ?? cert.subject?.O ?? '');
          const issuer = String(cert.issuer?.CN ?? cert.issuer?.O ?? '');
          chain.push({ subject, issuer, sha256: createHash('sha256').update(cert.raw).digest('hex'), validTo: cert.valid_to, selfSigned: subject === issuer, pem: toPem(cert.raw) });
          cert = cert.issuerCertificate;
        }
        secure.destroy();
        resolve(chain);
      });
      secure.once('error', fail);
    });
  });
}
