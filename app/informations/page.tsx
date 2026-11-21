import type { Metadata } from 'next';
import { InfoContent } from '@/components/slumbywise/InfoContent';

export const metadata: Metadata = {
  title: 'Mentions légales, conditions de vente et confidentialité | Slumbywise',
  description: 'Les informations légales de Slumbywise, site associatif de Denshiku : mentions légales, conditions de vente du livre et politique de confidentialité.',
};

/*
 * Version bêta : seules les informations connues sont publiées (rien n'est inventé).
 * À ajouter quand l'association les fournit : adresse complète du siège, numéro RNA (et SIRET),
 * responsable de la publication, adresse de l'hébergeur, propriété intellectuelle, mention TVA,
 * paiement, livraison, rétractation et retours, médiateur de la consommation, durée de conservation
 * des adresses de la lettre, bases légales et droits RGPD (recours CNIL).
 */
const anchor: React.CSSProperties = { scrollMarginTop: 110 };
const sub: React.CSSProperties = { font: "22px 'Instrument Serif', serif", margin: '26px 0 8px', color: 'var(--warm-white)' };

export default function InformationsPage() {
  return <InfoContent title="Les informations utiles." intro="Slumbywise est le site associatif de Denshiku, en version bêta. Pour toute question sur le site, une commande ou tes données, écris à denshiku.corp@gmail.com : nous te répondons et nous complétons cette page au fil de la bêta.">
    <section id="mentions-legales" style={anchor}>
      <h2>Mentions légales</h2>
      <h3 style={sub}>Éditeur du site</h3>
      <p>Association Denshiku, siège à Lille.</p>
      <p>Contact : <a href="mailto:denshiku.corp@gmail.com">denshiku.corp@gmail.com</a>.</p>
      <h3 style={sub}>Hébergement</h3>
      <p>Le site est hébergé par Netlify.</p>
    </section>

    <section id="conditions-de-vente" style={anchor}>
      <h2>Conditions de vente du livre</h2>
      <p>Ces conditions s’appliquent à la vente du livre « Le Carnet du Concierge », vendu 19 € par l’association Denshiku.</p>
      <h3 style={sub}>Commande</h3>
      <p>Les liens de commande de la boutique ouvrent WhatsApp, où l’échange se poursuit avec l’association : paiement, livraison et suivi sont précisés à ce moment-là.</p>
      <h3 style={sub}>Questions et réclamations</h3>
      <p>Pour toute question sur une commande ou une réclamation : <a href="mailto:denshiku.corp@gmail.com?subject=Commande%20Le%20Carnet%20du%20Concierge">denshiku.corp@gmail.com</a>.</p>
    </section>

    <section id="confidentialite" style={anchor}>
      <h2>Politique de confidentialité</h2>
      <h3 style={sub}>Responsable du traitement</h3>
      <p>Association Denshiku, joignable à <a href="mailto:denshiku.corp@gmail.com?subject=Mes%20donn%C3%A9es%20Slumbywise">denshiku.corp@gmail.com</a>.</p>
      <h3 style={sub}>La lettre du Carnet</h3>
      <p>L’inscription enregistre l’adresse e-mail que tu fournis, seulement après que tu as coché la case de consentement, jamais pré-cochée. Ton adresse sert uniquement à recevoir la lettre.</p>
      <p>Pour te désinscrire : <a href="mailto:denshiku.corp@gmail.com?subject=D%C3%A9sinscription%20du%20Carnet">denshiku.corp@gmail.com</a>.</p>
      <h3 style={sub}>Ton compte Grindleveling</h3>
      <p>Grindleveling utilise Supabase pour la connexion et l’enregistrement de ton profil, de tes quêtes, de tes projets et de tes bilans. Les informations que tu rends publiques dans ton profil ou dans les échanges sont destinées aux autres utilisateurs.</p>
      <p>Pour demander la suppression de ton compte ou poser une question sur tes données : <a href="mailto:denshiku.corp@gmail.com?subject=Mes%20donn%C3%A9es%20Slumbywise">écrire à Denshiku</a>.</p>
      <h3 style={sub}>Sur ton appareil</h3>
      <p>La connexion utilise les données de session du navigateur. Le minuteur en cours, son historique local et certains réglages restent sur ton appareil. Les bilans de concentration liés à une quête sont également enregistrés sur ton compte. Effacer les données du navigateur peut supprimer les sessions libres et les minuteurs non enregistrés.</p>
      <h3 style={sub}>Services extérieurs</h3>
      <p>Le site est hébergé sur Netlify et charge des polices Google Fonts. Les liens de commande ouvrent WhatsApp, où l’échange se poursuit selon les règles de ce service.</p>
    </section>
  </InfoContent>;
}
