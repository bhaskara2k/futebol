import { africaTeams } from './data/africa.data';
import { asiaTeams } from './data/asia.data';
import { europeTeams } from './data/europe.data';
import { northAmericaTeams } from './data/north-america.data';
import { otherTeams } from './data/other.data';
import { southAmericaTeams } from './data/south-america.data';

export const customPlayersData = [
  ...europeTeams,
  ...southAmericaTeams,
  ...asiaTeams,
  ...africaTeams,
  ...northAmericaTeams,
  ...otherTeams,
];
