import { LearningSet, SetType, Word } from './types';

export const initialWordLibrary: Word[] = [
  { text: 'mama', image_url: 'https://picsum.photos/seed/mama/400/300', category: 'Rodzina', syllables: ['ma', 'ma'] },
  { text: 'tata', image_url: 'https://picsum.photos/seed/tata/400/300', category: 'Rodzina', syllables: ['ta', 'ta'] },
  { text: 'dom', image_url: 'https://picsum.photos/seed/dom/400/300', category: 'Miejsca', syllables: ['dom'] },
  { text: 'kot', image_url: 'https://picsum.photos/seed/kot/400/300', category: 'Zwierzęta', syllables: ['kot'] },
  { text: 'pies', image_url: 'https://picsum.photos/seed/pies/400/300', category: 'Zwierzęta', syllables: ['pies'] },
  { text: 'piłka', image_url: 'https://picsum.photos/seed/pilka/400/300', category: 'Zabawki', syllables: ['pił', 'ka'] },
  { text: 'auto', image_url: 'https://picsum.photos/seed/auto/400/300', category: 'Pojazdy', syllables: ['au', 'to'] },
  { text: 'sok', image_url: 'https://picsum.photos/seed/sok/400/300', category: 'Jedzenie', syllables: ['sok'] },
  { text: 'woda', image_url: 'https://picsum.photos/seed/woda/400/300', category: 'Jedzenie', syllables: ['wo', 'da'] },
  { text: 'lalka', image_url: 'https://picsum.photos/seed/lalka/400/300', category: 'Zabawki', syllables: ['lal', 'ka'] },
  { text: 'lis', image_url: 'https://picsum.photos/seed/lis/400/300', category: 'Zwierzęta', syllables: ['lis'] },
  { text: 'liść', image_url: 'https://picsum.photos/seed/lisc/400/300', category: 'Natura', syllables: ['liść'] },
  { text: 'list', image_url: 'https://picsum.photos/seed/list/400/300', category: 'Przedmioty', syllables: ['list'] },
  { text: 'kura', image_url: 'https://picsum.photos/seed/kura/400/300', category: 'Zwierzęta', syllables: ['ku', 'ra'] },
  { text: 'kula', image_url: 'https://picsum.photos/seed/kula/400/300', category: 'Zabawki', syllables: ['ku', 'la'] },
  { text: 'lala', image_url: 'https://picsum.photos/seed/lala/400/300', category: 'Zabawki', syllables: ['la', 'la'] },
  { text: 'mapa', image_url: 'https://picsum.photos/seed/mapa/400/300', category: 'Przedmioty', syllables: ['ma', 'pa'] },
  { text: 'lama', image_url: 'https://picsum.photos/seed/lama/400/300', category: 'Zwierzęta', syllables: ['la', 'ma'] },
  { text: 'lampa', image_url: 'https://picsum.photos/seed/lampa/400/300', category: 'Przedmioty', syllables: ['lam', 'pa'] },
  { text: 'pupa', image_url: 'https://picsum.photos/seed/pupa/400/300', category: 'Ciało', syllables: ['pu', 'pa'] },
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