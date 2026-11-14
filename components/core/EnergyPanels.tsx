'use client';

import { useEffect, useState } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { useWillpower } from '@/hooks/useWillpower';
import { WillpowerControls, WillpowerGauge, WillpowerVisual } from './WillpowerGauge';
import { SocialBatteryPanel, SocialControls, SocialVisual } from './SocialBatteryPanel';

/** Même seuil que le menu latéral (shell.module.css). */
function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop;
}

/**
 * Réservoir de volonté et batterie sociale côte à côte.
 * Ordinateur : deux fenêtres. Téléphone : les deux jauges côte à côte en haut d'un même
 * panneau ; toucher l'une affiche ses boutons et ses conseils en dessous.
 */
export function EnergyPanels() {
  const desktop = useDesktop();
  const { willpower, social, ready, error } = useWillpower();
  const [tab, setTab] = useState<'will' | 'social'>('will');

  if (desktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <WillpowerGauge />
        <SocialBatteryPanel />
      </div>
    );
  }

  const tabStyle = (on: boolean, color: string): React.CSSProperties => ({
    flex: 1, minWidth: 0, padding: 8, cursor: 'pointer', textAlign: 'left', color: T.text,
    background: on ? `${color}14` : 'transparent', border: `1px solid ${on ? color : T.line}`,
  });

  return (
    <HudPanel label="VOLONTÉ · BATTERIE SOCIALE" glow={0.3}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error ? <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>Les jauges sont indisponibles pour le moment.</p>
          : !ready ? <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>
          : <>
            <div role="tablist" aria-label="Jauges" style={{ display: 'flex', gap: 8 }}>
              <button type="button" role="tab" id="tab-will" aria-selected={tab === 'will'} aria-controls="panel-will" onClick={() => setTab('will')} style={tabStyle(tab === 'will', T.cyan)}>
                <WillpowerVisual w={willpower} compact />
              </button>
              <button type="button" role="tab" id="tab-social" aria-selected={tab === 'social'} aria-controls="panel-social" onClick={() => setTab('social')} style={tabStyle(tab === 'social', T.amber)}>
                <SocialVisual b={social} compact />
              </button>
            </div>
            <div role="tabpanel" id={tab === 'will' ? 'panel-will' : 'panel-social'} aria-labelledby={tab === 'will' ? 'tab-will' : 'tab-social'}>
              {tab === 'will' ? <WillpowerControls /> : <SocialControls />}
            </div>
          </>}
      </div>
    </HudPanel>
  );
}
