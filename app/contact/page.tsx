import type { Metadata } from 'next';
import { InfoContent } from '@/components/slumbywise/InfoContent';
const WHATSAPP_ORDER_URL = 'https://wa.me/33783416511';
export const metadata: Metadata = {title:'Contact | Slumbywise',description:'Écrire à Denshiku au sujet de Slumbywise, du livre ou de ses projets.'};
export default function ContactPage(){return <InfoContent title="On garde le lien." intro="Une question sur le livre, une idée pour le projet ou un souci avec ton compte ? Écris-nous."><section><h2>Contacter Denshiku</h2><p><a href="mailto:denshiku.corp@gmail.com">denshiku.corp@gmail.com</a></p><p>Pour la presse : <a href="mailto:denshiku.corp@gmail.com?subject=Presse%20Slumbywise">présente-nous ta demande</a>.</p></section><section><h2>Commander le Livre</h2><p>La commande du Carnet du Concierge se fait par échange direct.</p><p><a href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer">Échanger sur WhatsApp</a></p></section></InfoContent>}
