import type { Metadata } from 'next';
import { AllflixCatalog } from '@/components/allflix/Allflix';
export const metadata:Metadata={title:'Allflix | Films, séries et animés',description:'Le catalogue Allflix par Slumbywise : synopsis, saisons et épisodes réunis sur une même fiche.'};
export default function Page(){return <AllflixCatalog/>;}
