import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;



























// ================= WAREZCDN SEARCH API ENDPOINT =================
app.get('/api/warez/search', async (req, res) => {
  const query = req.query.query as string;
  if (!query) {
    return res.json([]);
  }

  const qLower = query.toLowerCase();

  // Offline local catalog of blockbuster hits and popular movies/series (no AI/Gemini used for search)
  const backupDb = [
    {
      id: 'warez_157336',
      tmdbId: '157336',
      imdbId: 'tt0816692',
      title: 'Interestelar',
      type: 'movie',
      genres: ['Ficção Científica', 'Drama', 'Aventura'],
      year: 2014,
      rating: 8.7,
      duration: '2h 49min',
      ageRating: '10',
      synopsis: 'As reservas naturais da Terra estão se esgotando e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial.',
      posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_603',
      tmdbId: '603',
      imdbId: 'tt0133093',
      title: 'Matrix',
      type: 'movie',
      genres: ['Ficção Científica', 'Ação'],
      year: 1999,
      rating: 8.7,
      duration: '2h 16min',
      ageRating: '14',
      synopsis: 'Um jovem programador é atormentado por estranhos pesadelos nos quais está conectado por cabos a um imenso sistema de computador do futuro.',
      posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_155',
      tmdbId: '155',
      imdbId: 'tt0468569',
      title: 'Batman: O Cavaleiro das Trevas',
      type: 'movie',
      genres: ['Ação', 'Crime', 'Drama'],
      year: 2008,
      rating: 9.0,
      duration: '2h 32min',
      ageRating: '12',
      synopsis: 'Com a ajuda de Jim Gordon e do promotor público Harvey Dent, Batman mantém a ordem em Gotham City até que o Coringa, um gênio do crime anárquico, surge para instaurar o caos.',
      posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_1396',
      tmdbId: '1396',
      imdbId: 'tt0903747',
      title: 'Breaking Bad',
      type: 'series',
      genres: ['Drama', 'Crime'],
      year: 2008,
      rating: 9.5,
      duration: '5 Temporadas',
      ageRating: '18',
      synopsis: 'Um professor de química do ensino médio diagnosticado com câncer de pulmão terminal se junta a um ex-aluno para fabricar e vender metanfetamina para garantir o futuro de sua família.',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 5,
      episodesCount: [7, 13, 13, 13, 16]
    },
    {
      id: 'warez_66732',
      tmdbId: '66732',
      imdbId: 'tt5027774',
      title: 'Stranger Things',
      type: 'series',
      genres: ['Drama', 'Ficção Científica', 'Mistério'],
      year: 2016,
      rating: 8.7,
      duration: '4 Temporadas',
      ageRating: '16',
      synopsis: 'Quando um garoto desaparece, a cidade toda participa das buscas. Mas as investigações revelam mistérios envolvendo experimentos secretos do governo e uma garota com poderes sobrenaturais.',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 4,
      episodesCount: [8, 9, 8, 9]
    },
    {
      id: 'warez_27205',
      tmdbId: '27205',
      imdbId: 'tt1375666',
      title: 'A Origem (Inception)',
      type: 'movie',
      genres: ['Ficção Científica', 'Ação', 'Suspense'],
      year: 2010,
      rating: 8.8,
      duration: '2h 28min',
      ageRating: '14',
      synopsis: 'Um ladrão que invade os sonhos das pessoas e rouba segredos do subconsciente recebe a tarefa inversa: implantar uma ideia na mente de um herdeiro de um império.',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_1399',
      tmdbId: '1399',
      imdbId: 'tt0944947',
      title: 'Game of Thrones',
      type: 'series',
      genres: ['Fantasia', 'Drama', 'Ação'],
      year: 2011,
      rating: 9.2,
      duration: '8 Temporadas',
      ageRating: '18',
      synopsis: 'Várias famílias nobres lutam pelo controle do Trono de Ferro de Westeros para governar os Sete Reinos, enquanto uma antiga ameaça desperta no norte gelado.',
      posterUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 8,
      episodesCount: [10, 10, 10, 10, 10, 10, 7, 6]
    },
    {
      id: 'warez_76479',
      tmdbId: '76479',
      imdbId: 'tt1190634',
      title: 'The Boys',
      type: 'series',
      genres: ['Ação', 'Ficção Científica', 'Drama'],
      year: 2019,
      rating: 8.7,
      duration: '4 Temporadas',
      ageRating: '18',
      synopsis: 'A história em uma época em que super-heróis abraçam o lado negro de suas celebridades massivas. Um grupo de vigilantes conhecidos como "The Boys" se propõe a derrubar os super-heróis corruptos.',
      posterUrl: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 4,
      episodesCount: [8, 8, 8, 8]
    },
    {
      id: 'warez_475554',
      tmdbId: '475554',
      imdbId: 'tt7286456',
      title: 'Coringa (Joker)',
      type: 'movie',
      genres: ['Drama', 'Suspense', 'Crime'],
      year: 2019,
      rating: 8.4,
      duration: '2h 2min',
      ageRating: '16',
      synopsis: 'Isolado, intimidado e desconsiderado pela sociedade, o fracassado comediante Arthur Fleck inicia uma lenta descida à loucura enquanto se transforma no gênio do crime conhecido como Coringa.',
      posterUrl: 'https://images.unsplash.com/photo-1501430654243-c934ccd2c190?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1501430654243-c934ccd2c190?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_438631',
      tmdbId: '438631',
      imdbId: 'tt1160419',
      title: 'Duna (Dune)',
      type: 'movie',
      genres: ['Ficção Científica', 'Aventura'],
      year: 2021,
      rating: 8.0,
      duration: '2h 35min',
      ageRating: '14',
      synopsis: 'Paul Atreides, um jovem brilhante e talentoso nascido com um grande destiny para além da sua compreensão, deve viajar para o planeta mais perigoso do universo para garantir o futuro da sua família e do seu povo.',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_119051',
      tmdbId: '119051',
      imdbId: 'tt13443470',
      title: 'Wandinha (Wednesday)',
      type: 'series',
      genres: ['Comédia', 'Mistério', 'Fantasia'],
      year: 2022,
      rating: 8.1,
      duration: '1 Temporada',
      ageRating: '12',
      synopsis: 'Inteligente, sarcástica e um pouco morta por dentro, Wandinha Addams investiga uma onda de assassinatos enquanto faz novos amigos - e inimigos - na Escola Nunca Mais.',
      posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 1,
      episodesCount: [8]
    },
    {
      id: 'warez_872585',
      tmdbId: '872585',
      imdbId: 'tt15398776',
      title: 'Oppenheimer',
      type: 'movie',
      genres: ['História', 'Drama', 'Biografia'],
      year: 2023,
      rating: 8.9,
      duration: '3h 0min',
      ageRating: '16',
      synopsis: 'A história do físico J. Robert Oppenheimer liderando o Projeto Manhattan para desenvolver a primeira bomba atômica do mundo.',
      posterUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_346698',
      tmdbId: '346698',
      imdbId: 'tt1517268',
      title: 'Barbie',
      type: 'movie',
      genres: ['Comédia', 'Aventura', 'Fantasia'],
      year: 2023,
      rating: 7.2,
      duration: '1h 54min',
      ageRating: '12',
      synopsis: 'Viver na Terra da Barbie é ser perfeito no lugar perfeito. A menos que você tenha uma crise existencial completa ou seja o Ken.',
      posterUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_100088',
      tmdbId: '100088',
      imdbId: 'tt3581920',
      title: 'The Last of Us',
      type: 'series',
      genres: ['Ação', 'Aventura', 'Drama', 'Ficção Científica'],
      year: 2023,
      rating: 8.8,
      duration: '1 Temporada',
      ageRating: '16',
      synopsis: 'Joel e Ellie, uma dupla conectada pela dureza do mundo em que vivem, são forçados a suportar circunstâncias brutais em uma jornada pela América pós-pandêmica.',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 1,
      episodesCount: [9]
    },
    {
      id: 'warez_299534',
      tmdbId: '299534',
      imdbId: 'tt4154900',
      title: 'Vingadores: Ultimato',
      type: 'movie',
      genres: ['Ação', 'Aventura', 'Ficção Científica'],
      year: 2019,
      rating: 8.4,
      duration: '3h 1min',
      ageRating: '12',
      synopsis: 'Após os eventos devastadores de Vingadores: Guerra Infinita, o universo está em ruínas. Com a ajuda dos aliados restantes, os Vingadores se reúnem mais uma vez para reverter as ações de Thanos.',
      posterUrl: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_597',
      tmdbId: '597',
      imdbId: 'tt0120338',
      title: 'Titanic',
      type: 'movie',
      genres: ['Drama', 'Romance'],
      year: 1997,
      rating: 7.9,
      duration: '3h 14min',
      ageRating: '12',
      synopsis: 'Uma aristocrata de dezessete anos se apaixona por um artista gentil, mas pobre, a bordo do luxuoso e desafortunado R.M.S. Titanic.',
      posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_76600',
      tmdbId: '76600',
      imdbId: 'tt1630029',
      title: 'Avatar: O Caminho da Água',
      type: 'movie',
      genres: ['Ação', 'Aventura', 'Ficção Científica'],
      year: 2022,
      rating: 7.6,
      duration: '3h 12min',
      ageRating: '12',
      synopsis: 'Jake Sully vive com sua nova família no planeta Pandora. Uma ameaça familiar retorna para terminar o que começou, e Jake deve trabalhar com Neytiri para proteger seu lar.',
      posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_98',
      tmdbId: '98',
      imdbId: 'tt0172495',
      title: 'Gladiador',
      type: 'movie',
      genres: ['Ação', 'Drama', 'Aventura'],
      year: 2000,
      rating: 8.5,
      duration: '2h 35min',
      ageRating: '14',
      synopsis: 'Um ex-general romano jura vingança contra o filho corrupto do imperador que assassinou sua família e o condenou à escravidão como gladiador.',
      posterUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_808',
      tmdbId: '808',
      imdbId: 'tt0126029',
      title: 'Shrek',
      type: 'movie',
      genres: ['Animação', 'Comédia', 'Fantasia'],
      year: 2001,
      rating: 7.9,
      duration: '1h 30min',
      ageRating: 'L',
      synopsis: 'Um ogro tem sua tranquilidade invadida por personagens de contos de fadas banidos pelo malvado Lorde Farquaad. Para salvar seu lar, Shrek parte em uma missão para resgatar a bela princesa Fiona.',
      posterUrl: 'https://images.unsplash.com/photo-1608889174637-3c44f6326f20?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1608889174637-3c44f6326f20?auto=format&fit=crop&q=80&w=1200'
    },
    {
      id: 'warez_93405',
      tmdbId: '93405',
      imdbId: 'tt10919420',
      title: 'Round 6',
      type: 'series',
      genres: ['Ação', 'Suspense', 'Drama'],
      year: 2021,
      rating: 8.0,
      duration: '1 Temporada',
      ageRating: '18',
      synopsis: 'Centenas de jogadores com dificuldades financeiras aceitam um estranho convite para competir em jogos infantis tradicionais com consequências mortais em busca de um prêmio colossal.',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 1,
      episodesCount: [9]
    },
    {
      id: 'warez_1402',
      tmdbId: '1402',
      imdbId: 'tt1520265',
      title: 'The Walking Dead',
      type: 'series',
      genres: ['Drama', 'Ação', 'Ficção Científica'],
      year: 2010,
      rating: 8.5,
      duration: '11 Temporadas',
      ageRating: '16',
      synopsis: 'Um grupo de sobreviventes liderado pelo xerife Rick Grimes atravessa os Estados Unidos procurando abrigo em um mundo infestado de mortos-vivos.',
      posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 11,
      episodesCount: [6, 13, 16, 16, 16, 16, 16, 16, 16, 22, 24]
    },
    {
      id: 'warez_71446',
      tmdbId: '71446',
      imdbId: 'tt6468322',
      title: 'La Casa de Papel',
      type: 'series',
      genres: ['Ação', 'Drama', 'Crime'],
      year: 2017,
      rating: 8.2,
      duration: '5 Partes',
      ageRating: '16',
      synopsis: 'Um grupo altamente qualificado de assaltantes executa o assalto planejado mais complexo do século na Casa da Moeda da Espanha, coordenado pelo enigmático "Professor".',
      posterUrl: 'https://images.unsplash.com/photo-1501430654243-c934ccd2c190?auto=format&fit=crop&q=80&w=600',
      backdropUrl: 'https://images.unsplash.com/photo-1501430654243-c934ccd2c190?auto=format&fit=crop&q=80&w=1200',
      seasonsCount: 5,
      episodesCount: [9, 6, 8, 8, 10]
    }
  ];

  // Accent-insensitive local search on rich database
  const qClean = qLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filtered = backupDb.filter(item => {
    const titleClean = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const synopsisClean = item.synopsis.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const genresClean = item.genres.map(g => g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    return titleClean.includes(qClean) || 
           synopsisClean.includes(qClean) ||
           genresClean.some(g => g.includes(qClean)) ||
           item.year.toString().includes(qClean);
  });

  // Return filtered matches if found; otherwise, return the whole robust list so they always see options
  return res.json(filtered.length > 0 ? filtered : backupDb);
});

// ================= IPTV PLAYLIST LOADER & PARSER =================
interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  videoUrl: string;
  category: string;
  country: string;
  nowPlaying: string;
  nextShow: string;
  ticker: string[];
}

const defaultChannels: IPTVChannel[] = [
  {
    id: 'tv_record_news',
    name: 'Record News (Notícias ao Vivo)',
    logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=120',
    videoUrl: 'https://recordnews-r7-aws.sambatech.com.br/live/smil:rn.smil/playlist.m3u8',
    category: 'Notícias',
    country: 'BR',
    nowPlaying: 'Jornal Record News: Economia e Política',
    nextShow: 'Hora News (21:30)',
    ticker: [
      'RECORD NEWS: As principais manchetes do Brasil e do mundo com cobertura 24h',
      'Mercado financeiro fecha em alta de 1.25% nesta última sessão de negócios',
      'CINEPLAY: Assista canais reais em qualquer tela sem lag ou interrupções.'
    ]
  },
  {
    id: 'tv_sbt',
    name: 'SBT HD (Nacional)',
    logo: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&q=80&w=120',
    videoUrl: 'https://sbt-live.akamaized.net/hls/live/2012016/sbt/master.m3u8',
    category: 'Geral',
    country: 'BR',
    nowPlaying: 'Programação de Variedades e Novelas',
    nextShow: 'SBT Brasil Especial (20:30)',
    ticker: [
      'ASSISTA AO VIVO: Programação oficial aberta do SBT',
      'Novidades na grade: Novas séries e transmissões de torneios esportivos confirmados',
      'Seja bem-vindo à experiência de streaming CINEPLAY 100% Real!'
    ]
  },
  {
    id: 'tv_brasil',
    name: 'TV Brasil (Nacional e Cultura)',
    logo: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=120',
    videoUrl: 'https://ebctvlive3.ebc.com.br/hls/tvbrasil1.m3u8',
    category: 'Documentários',
    country: 'BR',
    nowPlaying: 'Brasil Documental: Pantanal Selvagem',
    nextShow: 'Repórter Brasil Noite (21:00)',
    ticker: [
      'TV BRASIL: Transmissão oficial de utilidade pública e cultura nacional',
      'Turismo: Parques nacionais registram aumento de 20% no número de visitantes',
      'Siga CINEPLAY para novas atualizações e mais canais liberados em tempo recorde!'
    ]
  },
  {
    id: 'tv_cultura',
    name: 'TV Cultura (Cultura e Educação)',
    logo: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=120',
    videoUrl: 'https://stream.tvcultura.com.br/cultura/live/playlist.m3u8',
    category: 'Documentários',
    country: 'BR',
    nowPlaying: 'Roda Viva: Entrevistas Históricas',
    nextShow: 'Metrópolis (22:15)',
    ticker: [
      'TV CULTURA: Uma das melhores emissoras de educação e arte do planeta',
      'Agenda Cultural: Exposições imperdíveis de arte contemporânea em cartaz',
      'Assista aos desenhos clássicos e debates com qualidade HD garantida.'
    ]
  },
  {
    id: 'tv_jovem_pan',
    name: 'Jovem Pan News (Debates e Opinião)',
    logo: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=120',
    videoUrl: 'https://live-jpn.jovempan.com.br/hls/live.m3u8',
    category: 'Notícias',
    country: 'BR',
    nowPlaying: 'Os Pingos nos Is (Opinião)',
    nextShow: 'Jornal da Manhã - Edição Resumo (22:00)',
    ticker: [
      'JOVEM PAN NEWS: Transmissão oficial ao vivo com debates acalorados sobre política',
      'Previsão do Tempo: Frente fria avança na região Sul e causa pancadas de chuva',
      'Interatividade total: Mande sua pergunta usando a hashtag do programa oficial.'
    ]
  }
];

let cachedChannels: IPTVChannel[] = [...defaultChannels];
let isFetchingIPTV = false;
let iptvError = '';

function parseM3U(m3uContent: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  const lines = m3uContent.split('\n');
  let currentChannel: Partial<IPTVChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      // Extract tvg-id
      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      // Extract tvg-country
      const countryMatch = line.match(/tvg-country="([^"]*)"/i);
      
      // Channel name is the text after the last comma
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }
      
      currentChannel.name = name || 'Canal Sem Nome';
      currentChannel.id = idMatch ? idMatch[1] : `ch_${Math.random().toString(36).substr(2, 9)}`;
      currentChannel.logo = logoMatch ? logoMatch[1] : '';
      currentChannel.category = groupMatch ? groupMatch[1] : 'Geral';
      currentChannel.country = countryMatch ? countryMatch[1] : '';
      
      if (!currentChannel.country && currentChannel.id) {
        const idParts = currentChannel.id.split('.');
        if (idParts.length > 1) {
          const possibleCountry = idParts[idParts.length - 1].toUpperCase();
          if (possibleCountry.length === 2) {
            currentChannel.country = possibleCountry;
          }
        }
      }
    } else if (!line.startsWith('#') && currentChannel) {
      currentChannel.videoUrl = line;
      
      if (line.startsWith('http://') || line.startsWith('https://')) {
        const name = currentChannel.name || 'Canal Sem Nome';
        const finalChannel: IPTVChannel = {
          id: currentChannel.id || `ch_${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          logo: currentChannel.logo || '',
          videoUrl: line,
          category: currentChannel.category || 'Geral',
          country: (currentChannel.country || 'US').toUpperCase(),
          nowPlaying: 'Programação de TV ao Vivo',
          nextShow: 'A Seguir',
          ticker: [
            `Assista ao vivo: ${name}`,
            `Transmissão real de TV via protocolo HLS`,
            `CinePlay: Plataforma de entretenimento real sem barreiras`
          ]
        };
        channels.push(finalChannel);
      }
      currentChannel = null;
    }
  }
  return channels;
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchIPTVChannels() {
  if (isFetchingIPTV) return;
  isFetchingIPTV = true;
  iptvError = '';
  try {
    console.log('Fetching IPTV channels from regions/amer.m3u and countries/br.m3u...');
    
    const playlists = [
      { name: 'amer.m3u', url: 'https://iptv-org.github.io/iptv/regions/amer.m3u', defaultCountry: 'US' },
      { name: 'br.m3u', url: 'https://iptv-org.github.io/iptv/countries/br.m3u', defaultCountry: 'BR' }
    ];

    const fetchPromises = playlists.map(async (playlist) => {
      try {
        console.log(`Iniciando download de ${playlist.name}...`);
        const response = await fetchWithTimeout(playlist.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, 6000);
        if (!response.ok) {
          throw new Error(`Falha status ${response.status}`);
        }
        const text = await response.text();
        console.log(`Playlist ${playlist.name} carregada com sucesso (${(text.length / 1024).toFixed(1)} KB)`);
        const parsed = parseM3U(text);
        
        // Force the country to defaultCountry if not set or for country-specific playlists
        parsed.forEach(ch => {
          if (playlist.defaultCountry === 'BR') {
            ch.country = 'BR';
          } else if (!ch.country) {
            ch.country = playlist.defaultCountry;
          }
        });
        
        return parsed;
      } catch (err: any) {
        console.warn(`Erro ao baixar playlist ${playlist.name}:`, err.message || err);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const combined = results.flat();

    if (combined.length > 0) {
      // Deduplicate channels by videoUrl
      const seenUrls = new Set<string>();
      const uniqueChannels: IPTVChannel[] = [];

      for (const ch of combined) {
        if (!seenUrls.has(ch.videoUrl)) {
          seenUrls.add(ch.videoUrl);
          uniqueChannels.push(ch);
        }
      }

      cachedChannels = uniqueChannels;
      console.log(`Sucesso! ${cachedChannels.length} canais carregados no cache (deduplicados).`);
    } else {
      throw new Error('Nenhum canal pôde ser extraído das playlists.');
    }
  } catch (error: any) {
    console.warn('Erro ao baixar ou processar as playlists de TV:', error.message || error);
    iptvError = error.message || 'Erro de rede.';
  } finally {
    isFetchingIPTV = false;
  }
}

// REST endpoints for TV Channels
app.get('/api/iptv/channels', async (req, res) => {
  // If we only have the default channels and aren't fetching, and we are NOT on Vercel,
  // we can fire off a background fetch to populate the rest of the playlist.
  if (cachedChannels.length === defaultChannels.length && !isFetchingIPTV && !process.env.VERCEL) {
    fetchIPTVChannels().catch(err => console.error('Background IPTV loading error:', err));
  }

  const { country, category, search, limit = '60', offset = '0' } = req.query;
  let result = [...cachedChannels];

  // Filters
  if (country) {
    const cUpper = String(country).toUpperCase();
    result = result.filter(ch => ch.country === cUpper);
  }

  if (category) {
    const catLower = String(category).toLowerCase();
    result = result.filter(ch => ch.category.toLowerCase().includes(catLower));
  }

  if (search) {
    const sLower = String(search).toLowerCase();
    result = result.filter(ch => 
      ch.name.toLowerCase().includes(sLower) || 
      ch.category.toLowerCase().includes(sLower)
    );
  }

  // Extraction of unique metadata for filters (using the full cache)
  const fullSource = cachedChannels;
  const countries = Array.from(new Set(fullSource.map(ch => ch.country).filter(Boolean))).sort();
  const categories = Array.from(new Set(fullSource.map(ch => ch.category).filter(Boolean))).sort();

  const parsedLimit = parseInt(String(limit), 10) || 60;
  const parsedOffset = parseInt(String(offset), 10) || 0;

  const total = result.length;
  const paginatedResult = Math.min(parsedOffset, total) >= total 
    ? [] 
    : result.slice(parsedOffset, parsedOffset + parsedLimit);

  res.json({
    channels: paginatedResult,
    total,
    countries,
    categories,
    isFetching: isFetchingIPTV,
    error: iptvError
  });
});

// ================= IPTV STREAM PROXY (Bypass CORS and Mixed Content) =================
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch (e) {
    return relativeUrl;
  }
}

app.get('/api/iptv/proxy', async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('URL is required');
  }

  try {
    const parsedUrl = new URL(streamUrl);
    
    // Fetch stream segment or playlist
    const response = await fetchWithTimeout(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsedUrl.origin
      }
    }, 4000);

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch remote stream: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isPlaylist = streamUrl.toLowerCase().endsWith('.m3u8') || 
                       streamUrl.toLowerCase().includes('m3u8') ||
                       contentType.includes('mpegurl') || 
                       contentType.includes('application/x-mpegURL') ||
                       contentType.includes('application/vnd.apple.mpegurl') ||
                       contentType.includes('text/plain');

    if (isPlaylist) {
      const text = await response.text();
      // Check if it's an M3U playlist format
      if (text.includes('#EXTM3U')) {
        const lines = text.split('\n');
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          
          if (trimmed.startsWith('#')) {
            // Rewrite URI tags, such as #EXT-X-KEY:METHOD=AES-128,URI="http://..."
            // or sub-playlist links inside tag attributes
            let modified = line;
            const uriMatch = line.match(/URI="([^"]+)"/i);
            if (uriMatch) {
              const originalUri = uriMatch[1];
              const absoluteUri = resolveUrl(streamUrl, originalUri);
              const proxiedUri = `/api/iptv/proxy?url=${encodeURIComponent(absoluteUri)}`;
              modified = line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`);
            }
            return modified;
          }
          
          // Rewrite actual segment paths/URLs
          const absolute = resolveUrl(streamUrl, trimmed);
          return `/api/iptv/proxy?url=${encodeURIComponent(absolute)}`;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(rewrittenLines.join('\n'));
      }
    }

    // Proxy binary ts segments or other files
    res.setHeader('Content-Type', contentType || 'video/MP2T');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));

  } catch (error: any) {
    const errMsg = error.message || '';
    const isNetworkError = errMsg.includes('ENOTFOUND') || 
                           errMsg.includes('ECONNREFUSED') || 
                           errMsg.includes('ETIMEDOUT') || 
                           errMsg.includes('timeout') || 
                           errMsg.includes('fetch failed') ||
                           error.code === 'ENOTFOUND' ||
                           error.code === 'ETIMEDOUT';
    
    if (isNetworkError) {
      console.log(`[IPTV Connection] Stream connection currently unavailable for URL: ${streamUrl} (${errMsg}). Attempting stable public fallback.`);
      
      const isPlaylistRequest = streamUrl.toLowerCase().includes('m3u8') || streamUrl.toLowerCase().includes('.m3u8');
      if (isPlaylistRequest) {
        // Fallback to highly stable Record News
        const fallbackUrl = 'https://recordnews-r7-aws.sambatech.com.br/live/smil:rn.smil/playlist.m3u8';
        try {
          const fallbackResponse = await fetchWithTimeout(fallbackUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': new URL(fallbackUrl).origin
            }
          }, 3000);
          
          if (fallbackResponse.ok) {
            const text = await fallbackResponse.text();
            if (text.includes('#EXTM3U')) {
              const lines = text.split('\n');
              const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (trimmed.startsWith('#')) {
                  let modified = line;
                  const uriMatch = line.match(/URI="([^"]+)"/i);
                  if (uriMatch) {
                    const originalUri = uriMatch[1];
                    const absoluteUri = resolveUrl(fallbackUrl, originalUri);
                    const proxiedUri = `/api/iptv/proxy?url=${encodeURIComponent(absoluteUri)}`;
                    modified = line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`);
                  }
                  return modified;
                }
                const absolute = resolveUrl(fallbackUrl, trimmed);
                return `/api/iptv/proxy?url=${encodeURIComponent(absolute)}`;
              });
              
              res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              return res.send(rewrittenLines.join('\n'));
            }
          }
        } catch (fErr: any) {
          console.log(`[IPTV Proxy] Fallback failed: ${fErr.message}`);
        }
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).send(`Upstream stream offline: ${errMsg}`);
    } else {
      console.log(`[IPTV Connection Error] Unexpected error for URL ${streamUrl}:`, error.message || error);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(500).send(`Proxy error: ${errMsg}`);
    }
  }
});

app.post('/api/iptv/reload', async (req, res) => {
  fetchIPTVChannels(); // Run in background
  res.json({ status: 'started', isFetching: isFetchingIPTV });
});

// Setup Vite Dev Server / Static Files
async function startServer() {
  // Start loading IPTV channels on server start
  fetchIPTVChannels().catch(err => console.error('Initial IPTV loading error:', err));
  
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export app for serverless platforms like Vercel
export { app };

// Only start standalone express server if NOT running on Vercel (serverless environment)
if (!process.env.VERCEL) {
  startServer();
}
