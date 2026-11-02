import type { Metadata } from 'next';
import { AllflixDetail } from '@/components/allflix/Allflix';
export const metadata:Metadata={title:'Fiche | Allflix',robots:{index:false,follow:true}};
export default function Page(){return <AllflixDetail/>;}
