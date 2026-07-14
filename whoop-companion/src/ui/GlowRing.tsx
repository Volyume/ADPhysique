/**
 * Premium progress ring. The Skia implementation was removed after a native
 * module was implicated in a startup crash on device; GlowRing now renders the
 * SVG Ring (which already has a glow halo + gradient), so hero screens keep
 * working. The Skia version can return once it is verified on a device build.
 */
import { Ring } from './components';

export type GlowRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
};

export function GlowRing(props: GlowRingProps) {
  return <Ring {...props} />;
}
