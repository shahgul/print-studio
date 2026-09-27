import { Length, QuarterTurn, Size2D, rotateSize } from '@print-studio/units-geometry';

export enum StandardMedia {
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  Letter = 'LETTER',
}

export enum Orientation {
  Portrait = 'PORTRAIT',
  Landscape = 'LANDSCAPE',
}

function getPortraitSize(media: StandardMedia): Size2D {
  switch (media) {
    case StandardMedia.A3:
      return Size2D.of(Length.mm(297), Length.mm(420));
    case StandardMedia.A4:
      return Size2D.of(Length.mm(210), Length.mm(297));
    case StandardMedia.A5:
      return Size2D.of(Length.mm(148), Length.mm(210));
    case StandardMedia.Letter:
      return Size2D.of(Length.inches(8.5), Length.inches(11));
  }
}

export function getStandardMediaSize(
  media: StandardMedia,
  orientation: Orientation = Orientation.Portrait,
): Size2D {
  const portrait = getPortraitSize(media);

  return orientation === Orientation.Portrait
    ? portrait
    : rotateSize(portrait, QuarterTurn.Deg90);
}
