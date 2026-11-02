'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import s from './shell.module.css';
export function InfoContent({title,intro,children}:{title:string;intro:string;children:ReactNode}) {
  useSlumbywiseBody();
  return <><SlumbywiseStyles/><div className="sw-root"><SlumbywiseNav/><main className={s.info}><Link href="/" className={s.back}>Accueil</Link><h1>{title}</h1><p className={s.intro}>{intro}</p><div className={s.sections}>{children}</div></main><SlumbywiseFooter/></div></>;
}
