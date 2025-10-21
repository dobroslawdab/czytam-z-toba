import { LearningSet, SetType, Word } from './types';

export const initialWordLibrary: Word[] = [
  { id: '1', text: 'mama', image: 'https://picsum.photos/seed/mama/400/300', category: 'Rodzina', syllables: ['ma', 'ma'] },
  { id: '2', text: 'tata', image: 'https://picsum.photos/seed/tata/400/300', category: 'Rodzina', syllables: ['ta', 'ta'] },
  { id: '3', text: 'dom', image: 'https://picsum.photos/seed/dom/400/300', category: 'Miejsca', syllables: ['dom'] },
  { id: '4', text: 'kot', image: 'https://picsum.photos/seed/kot/400/300', category: 'Zwierzęta', syllables: ['kot'] },
  { id: '5', text: 'pies', image: 'https://picsum.photos/seed/pies/400/300', category: 'Zwierzęta', syllables: ['pies'] },
  { id: '6', text: 'piłka', image: 'https://picsum.photos/seed/pilka/400/300', category: 'Zabawki', syllables: ['pił', 'ka'] },
  { id: '7', text: 'auto', image: 'https://picsum.photos/seed/auto/400/300', category: 'Pojazdy', syllables: ['au', 'to'] },
  { id: '8', text: 'sok', image: 'https://picsum.photos/seed/sok/400/300', category: 'Jedzenie', syllables: ['sok'] },
  { id: '9', text: 'woda', image: 'https://picsum.photos/seed/woda/400/300', category: 'Jedzenie', syllables: ['wo', 'da'] },
  { id: '10', text: 'lalka', image: 'https://picsum.photos/seed/lalka/400/300', category: 'Zabawki', syllables: ['lal', 'ka'] },
  { id: '11', text: 'lis', image: 'https://picsum.photos/seed/lis/400/300', category: 'Zwierzęta', syllables: ['lis'] },
  { id: '12', text: 'liść', image: 'https://picsum.photos/seed/lisc/400/300', category: 'Natura', syllables: ['liść'] },
  { id: '13', text: 'list', image: 'https://picsum.photos/seed/list/400/300', category: 'Przedmioty', syllables: ['list'] },
  { id: '14', text: 'kura', image: 'https://picsum.photos/seed/kura/400/300', category: 'Zwierzęta', syllables: ['ku', 'ra'] },
  { id: '15', text: 'kula', image: 'https://picsum.photos/seed/kula/400/300', category: 'Zabawki', syllables: ['ku', 'la'] },
  { id: '16', text: 'lala', image: 'https://picsum.photos/seed/lala/400/300', category: 'Zabawki', syllables: ['la', 'la'] },
  { id: '17', text: 'mapa', image: 'https://picsum.photos/seed/mapa/400/300', category: 'Przedmioty', syllables: ['ma', 'pa'] },
  { id: '18', text: 'lama', image: 'https://picsum.photos/seed/lama/400/300', category: 'Zwierzęta', syllables: ['la', 'ma'] },
  { id: '19', text: 'lampa', image: 'https://picsum.photos/seed/lampa/400/300', category: 'Przedmioty', syllables: ['lam', 'pa'] },
  { id: '20', text: 'pupa', image: 'https://picsum.photos/seed/pupa/400/300', category: 'Ciało', syllables: ['pu', 'pa'] },
];

export const initialLearningSets: LearningSet[] = [
    {
        id: 1,
        name: 'Rodzina',
        type: SetType.PictureCards,
        wordIds: ['1', '2', '3']
    },
    {
        id: 2,
        name: 'Zwierzęta',
        type: SetType.PictureCards,
        wordIds: ['4', '5', '11', '14']
    },
    {
        id: 6,
        name: 'Gra w Memory - Podstawy',
        type: SetType.PictureCards,
        wordIds: ['1', '2', '16', '17', '18', '19', '7', '20', '14', '10']
    },
    {
        id: 3,
        name: 'Do analizy',
        type: SetType.Analysis,
        wordIds: ['6', '7', '10']
    },
    {
        id: 4,
        name: 'Porównania',
        type: SetType.Comparison,
        wordIds: ['11', '12', '13']
    },
    {
        id: 5,
        name: 'Historyjka o kocie',
        type: SetType.Booklet,
        wordIds: ['1', '4', '9'],
        sentences: [
            { text: "To jest kot." },
            { text: "Mama ma kota." },
            { text: "Kot pije wodę." },
        ]
    }
];