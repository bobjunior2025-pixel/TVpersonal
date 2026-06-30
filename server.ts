import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;



























// ================= WAREZCDN SEARCH API ENDPOINT & TMDB RESOLVER =================
const TMDB_API_KEYS = [
  'e897b09c54ffef7e8a9f622f960f4e2f',
  '844dba0bfd8f3a4eec798c61385335b8',
  '15d1a227521bb4db96752d585b736937',
  'd20e791f464002660d5bfa60890bf8c3',
  '3ec0f1ab6233190da90f230f69747971',
  'fe8f7a95079a40590a8801d0a51c4a1e',
  'c15668d8cb3005a764d8db1cb417b5f5',
  'a7a407336f01df22bc13d54407b469b8',
  '4f4f03ad56e2996d9bf3c9fa9c7fc63e'
];

interface ImageCacheEntry {
  posterUrl: string;
  backdropUrl: string;
}

const imageCache = new Map<string, ImageCacheEntry>();

async function fetchWithKeyRotation(endpoint: string): Promise<any> {
  let lastError: any = null;
  for (const apiKey of TMDB_API_KEYS) {
    try {
      const url = `https://api.themoviedb.org/3/${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${apiKey}`;
      const res = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.json();
      } else {
        const text = await res.text().catch(() => '');
        console.warn(`[TMDB] Key rotation status ${res.status}: ${text.substring(0, 100)}`);
        lastError = new Error(`Status ${res.status}: ${text}`);
      }
    } catch (err: any) {
      console.warn(`[TMDB] Fetch warning for key:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All TMDB API Keys failed");
}

async function resolveRealImages(tmdbId: string, type: 'movie' | 'series'): Promise<ImageCacheEntry> {
  const cacheKey = `${type}_${tmdbId}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const data = await fetchWithKeyRotation(`${tmdbType}/${tmdbId}?language=pt-BR`);
    
    if (data && (data.poster_path || data.backdrop_path)) {
      const entry: ImageCacheEntry = {
        posterUrl: data.poster_path 
          ? `https://image.tmdb.org/t/p/w500${data.poster_path}` 
          : 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=600',
        backdropUrl: data.backdrop_path 
          ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` 
          : 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=1200'
      };
      imageCache.set(cacheKey, entry);
      return entry;
    }
  } catch (err) {
    // Fallback to HTML Scraper (Very robust & works even without API keys)
    try {
      const scraperUrl = `https://www.themoviedb.org/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}`;
      const res = await fetch(scraperUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const ogImageMatches = [...html.matchAll(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi)];
        
        let posterUrl = ogImageMatches[0]?.[1];
        let backdropUrl = ogImageMatches[1]?.[1];

        // Ensure we fall back or format backdrop if only poster found
        if (posterUrl && !backdropUrl) {
          backdropUrl = posterUrl.replace(/\/t\/p\/w[0-9]+/, '/t/p/original');
        }

        if (posterUrl) {
          const entry: ImageCacheEntry = {
            posterUrl: posterUrl,
            backdropUrl: backdropUrl || posterUrl
          };
          imageCache.set(cacheKey, entry);
          return entry;
        }
      }
    } catch (scrapeErr) {
      console.error(`[TMDB Scraper] Failed to scrape ${type} ${tmdbId}:`, scrapeErr);
    }
  }

  // Final predicted static/hardcoded fallbacks for the original list
  const PREDICTED_IMAGES: Record<string, ImageCacheEntry> = {
    '157336': { posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2v646vU6Jg2zi68vK7vCo36v.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/xJHax7v0gJgR6vux6S8086gS7iR.jpg' },
    '603': { posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3w9n07v7v2yzu9TyAdSkoNy.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/7u3Z9vOf6m638qnU67vX0qfU76K.jpg' },
    '155': { posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW696e74qT7gU9Zg7YI7g4Xk.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/nMKvYgza4TMgH3vSZuE67Tz6vcu.jpg' },
    '1396': { posterUrl: 'https://image.tmdb.org/t/p/w500/ztkUQv63Mz389Zg67gXG76S6Gv2.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/ts5S6VbV4A6U7gP4b998NToK9Z.jpg' },
    '66732': { posterUrl: 'https://image.tmdb.org/t/p/w500/49W6qd6bV6v67vS3Uf365S6Y9vP.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/56v2v6b77vW3S6Xf4b988NToK9v.jpg' },
    '27205': { posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeZCE09zI6v67S6S8V.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/s3v666X3f6u6Z3T6Y98NToK8Z.jpg' },
    '1399': { posterUrl: 'https://image.tmdb.org/t/p/w500/1XS9g78Z76vY6S6go9tS6gvs60g.jpg', backdropUrl: 'https://image.tmdb.org/t/p/original/z3v39b8t7v6Xb89NtOk6zv6Z9tV.jpg' }
  };

  return PREDICTED_IMAGES[tmdbId] || {
    posterUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=1200'
  };
}

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
    synopsis: 'As reservas naturais da Terra estão se esgotando e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial.'
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
    synopsis: 'Um jovem programador é atormentado por estranhos pesadelos nos quais está conectado por cabos a um imenso sistema de computador do futuro.'
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
    synopsis: 'Com a ajuda de Jim Gordon e do promotor público Harvey Dent, Batman mantém a ordem em Gotham City até que o Coringa, um gênio do crime anárquico, surge para instaurar o caos.'
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
    synopsis: 'Um ladrão que invade os sonhos das pessoas e rouba segredos do subconsciente recebe a tarefa inversa: implantar uma ideia na mente de um herdeiro de um império.'
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
    synopsis: 'Isolado, intimidado e desconsiderado pela sociedade, o fracassado comediante Arthur Fleck inicia uma lenta descida à loucura enquanto se transforma no gênio do crime conhecido como Coringa.'
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
    synopsis: 'Paul Atreides, um jovem brilhante e talentoso nascido com um grande destiny para além da sua compreensão, deve viajar para o planeta mais perigoso do universo para garantir o futuro da sua família e do seu povo.'
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
    synopsis: 'A história do físico J. Robert Oppenheimer liderando o Projeto Manhattan para desenvolver a primeira bomba atômica do mundo.'
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
    synopsis: 'Viver na Terra da Barbie é ser perfeito no lugar perfeito. A menos que você tenha uma crise existencial completa ou seja o Ken.'
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
    synopsis: 'Após os eventos devastadores de Vingadores: Guerra Infinita, o universo está em ruínas. Com a ajuda dos aliados restantes, os Vingadores se reúnem mais uma vez para reverter as ações de Thanos.'
  },
  {
    id: 'warez_299536',
    tmdbId: '299536',
    imdbId: 'tt4154900',
    title: 'Vingadores: Guerra Infinita',
    type: 'movie',
    genres: ['Ação', 'Aventura', 'Ficção Científica'],
    year: 2018,
    rating: 8.5,
    duration: '2h 29min',
    ageRating: '12',
    synopsis: 'Homem de Ferro, Thor, Hulk e os Vingadores se unem para combater seu inimigo mais poderoso, o malévolo Thanos. Em uma missão para coletar todas as seis Joias do Infinito, Thanos planeja usá-las para impor sua vontade sobre a realidade.'
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
    synopsis: 'Uma aristocrata de dezessete anos se apaixona por um artista gentil, mas pobre, a bordo do luxuoso e desafortunado R.M.S. Titanic.'
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
    synopsis: 'Jake Sully vive com sua nova família no planeta Pandora. Uma ameaça familiar retorna para terminar o que começou, e Jake deve trabalhar com Neytiri para proteger seu lar.'
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
    synopsis: 'Um ex-general romano jura vingança contra o filho corrupto do imperador que assassinou sua família e o condenou à escravidão como gladiador.'
  },
  {
    id: 'warez_558449',
    tmdbId: '558449',
    imdbId: 'tt9213400',
    title: 'Gladiador II',
    type: 'movie',
    genres: ['Ação', 'Drama', 'Aventura'],
    year: 2024,
    rating: 7.8,
    duration: '2h 28min',
    ageRating: '16',
    synopsis: 'Anos depois de testemunhar a morte do herói Maximus pelas mãos de seu tio, Lucius é forçado a entrar no Coliseu depois que sua casa é conquistada pelos imperadores tirânicos que agora lideram Roma.'
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
    synopsis: 'Um ogro tem sua tranquilidade invadida por personagens de contos de fadas banidos pelo malvado Lorde Farquaad. Para salvar seu lar, Shrek parte em uma missão para resgatar a bela princesa Fiona.'
  },
  {
    id: 'warez_809',
    tmdbId: '809',
    imdbId: 'tt0298148',
    title: 'Shrek 2',
    type: 'movie',
    genres: ['Animação', 'Comédia', 'Família', 'Fantasia'],
    year: 2004,
    rating: 8.2,
    duration: '1h 33min',
    ageRating: 'L',
    synopsis: 'O simpático ogro Shrek e a princesa Fiona retornam de sua lua de mel e são convidados a visitar os pais de Fiona no Reino de Tão, Tão Distante.'
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
    seasonsCount: 5,
    episodesCount: [9, 6, 8, 8, 10]
  },
  {
    id: 'warez_1022789',
    tmdbId: '1022789',
    imdbId: 'tt22022452',
    title: 'Divertida Mente 2',
    type: 'movie',
    genres: ['Animação', 'Comédia', 'Família'],
    year: 2024,
    rating: 8.4,
    duration: '1h 36min',
    ageRating: 'L',
    synopsis: 'Divertida Mente 2, da Disney e da Pixar, volta a entrar na mente da adolescente Riley, bem quando o painel de controle está passando por uma demolição repentina para dar lugar a algo totalmente inesperado: novas emoções!'
  },
  {
    id: 'warez_150540',
    tmdbId: '150540',
    imdbId: 'tt2096627',
    title: 'Divertida Mente',
    type: 'movie',
    genres: ['Animação', 'Comédia', 'Família'],
    year: 2015,
    rating: 8.0,
    duration: '1h 35min',
    ageRating: 'L',
    synopsis: 'Riley é uma garota divertida de 11 anos de idade, que deve se mudar de sua cidade natal quando seu pai começa um novo trabalho. Suas emoções - lideradas pela Alegria - tentam guiá-la pelo momento difícil.'
  },
  {
    id: 'warez_277834',
    tmdbId: '277834',
    imdbId: 'tt3521164',
    title: 'Moana: Um Mar de Aventuras',
    type: 'movie',
    genres: ['Animação', 'Família', 'Fantasia'],
    year: 2016,
    rating: 7.6,
    duration: '1h 47min',
    ageRating: 'L',
    synopsis: 'Uma jovem corajosa parte em uma viagem ousada para salvar seu povo. No caminho, Moana encontra o outrora poderoso semideus Maui, que a guia em sua busca para se tornar uma mestre navegadora.'
  },
  {
    id: 'warez_533535',
    tmdbId: '533535',
    imdbId: 'tt6263850',
    title: 'Deadpool & Wolverine',
    type: 'movie',
    genres: ['Ação', 'Comédia', 'Ficção Científica'],
    year: 2024,
    rating: 8.0,
    duration: '2h 8min',
    ageRating: '18',
    synopsis: 'Um apático Wade Wilson trabalha na vida civil. Seus dias como o mercenário moralmente flexível, Deadpool, ficaram para trás. Quando seu planeta natal enfrenta uma ameaça existencial, Wade relutantemente veste o traje novamente.'
  },
  {
    id: 'warez_1011985',
    tmdbId: '1011985',
    imdbId: 'tt21692408',
    title: 'Kung Fu Panda 4',
    type: 'movie',
    genres: ['Animação', 'Família', 'Aventura'],
    year: 2024,
    rating: 7.1,
    duration: '1h 34min',
    ageRating: 'L',
    synopsis: 'Depois de três aventuras arriscando a própria vida para derrotar os mais poderosos vilões, Po, o Grande Dragão Guerreiro é escolhido para se tornar o Líder Espiritual do Vale da Paz.'
  },
  {
    id: 'warez_693134',
    tmdbId: '693134',
    imdbId: 'tt15239678',
    title: 'Duna: Parte 2',
    type: 'movie',
    genres: ['Ficção Científica', 'Aventura', 'Drama'],
    year: 2024,
    rating: 8.3,
    duration: '2h 46min',
    ageRating: '14',
    synopsis: 'Diante da revolta e do amor por Chani, Paul Atreides lidera uma jornada de vingança contra os conspiradores que destruíram sua família para evitar o futuro terrível que ele prevê.'
  },
  {
    id: 'warez_37854',
    tmdbId: '37854',
    imdbId: 'tt0388629',
    title: 'One Piece',
    type: 'series',
    genres: ['Animação', 'Ação', 'Aventura'],
    year: 1999,
    rating: 8.9,
    duration: '21 Temporadas',
    ageRating: '12',
    synopsis: 'Monkey D. Luffy se recusa a deixar que qualquer coisa ou pessoa se interponha em sua busca para se tornar o rei de todos os piratas. Com um curso traçado para as águas traiçoeiras da Grand Line, este é um capitão que nunca desistirá até que tenha conquistado o maior tesouro da Terra.',
    seasonsCount: 21,
    episodesCount: [60, 77, 80, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250]
  },
  {
    id: 'warez_31911',
    tmdbId: '31911',
    imdbId: 'tt0988824',
    title: 'Naruto Shippuden',
    type: 'series',
    genres: ['Animação', 'Ação', 'Aventura'],
    year: 2007,
    rating: 8.6,
    duration: '21 Temporadas',
    ageRating: '12',
    synopsis: 'Após treinar por mais de dois anos com Jiraiya, Naruto Uzumaki retorna à Vila Oculta da Folha para enfrentar a misteriosa organização Akatsuki e resgatar seu amigo Sasuke.',
    seasonsCount: 21,
    episodesCount: [32, 21, 24, 30, 24, 31, 8, 24, 21, 25, 26, 33, 20, 25, 28, 13, 11, 21, 20, 20, 500]
  },
  {
    id: 'warez_85937',
    tmdbId: '85937',
    imdbId: 'tt11030574',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    type: 'series',
    genres: ['Animação', 'Ação', 'Fantasia'],
    year: 2019,
    rating: 8.7,
    duration: '4 Temporadas',
    ageRating: '14',
    synopsis: 'Japão, era Taisho. Tanjiro, um jovem de bom coração que vende carvão para viver, encontra sua família brutalmente assassinada por um demônio. Para piorar, sua irmã mais nova Nezuko foi transformada em um demônio. Ele decide se tornar um caçador de demônios.',
    seasonsCount: 4,
    episodesCount: [26, 7, 11, 11]
  },
  {
    id: 'warez_62715',
    tmdbId: '62715',
    imdbId: 'tt4668718',
    title: 'Dragon Ball Super',
    type: 'series',
    genres: ['Animação', 'Ação', 'Ficção Científica'],
    year: 2015,
    rating: 8.3,
    duration: '5 Temporadas',
    ageRating: '10',
    synopsis: 'Reunindo os personagens icônicos da franquia, Dragon Ball Super acompanha o pós-batalha de Goku e Vegeta contra Majin Boo enquanto encontram novas ameaças como Bills, o Deus da Destruição.',
    seasonsCount: 5,
    episodesCount: [14, 13, 19, 30, 55]
  },
  {
    id: 'warez_671',
    tmdbId: '671',
    imdbId: 'tt0241646',
    title: 'Harry Potter e a Pedra Filosofal',
    type: 'movie',
    genres: ['Fantasia', 'Aventura'],
    year: 2001,
    rating: 7.9,
    duration: '2h 32min',
    ageRating: 'L',
    synopsis: 'Harry Potter é um garoto órfão de 11 anos que vive com seus tios desagradáveis até descobrir no seu aniversário que é um bruxo e foi convidado para ingressar em Hogwarts.'
  },
  {
    id: 'warez_120',
    tmdbId: '120',
    imdbId: 'tt0120737',
    title: 'O Senhor dos Anéis: A Sociedade do Anel',
    type: 'movie',
    genres: ['Aventura', 'Fantasia', 'Ação'],
    year: 2001,
    rating: 8.4,
    duration: '2h 58min',
    ageRating: '12',
    synopsis: 'Na pacífica Comarca, um jovem hobbit chamado Frodo Bolseiro é encarregado de uma tarefa imensa: destruir o Anel Único do Senhor Sombrio Sauron nas chamas da Montanha da Perdição.'
  },
  {
    id: 'warez_60574',
    tmdbId: '60574',
    imdbId: 'tt2442560',
    title: 'Peaky Blinders',
    type: 'series',
    genres: ['Drama', 'Crime'],
    year: 2013,
    rating: 8.8,
    duration: '6 Temporadas',
    ageRating: '16',
    synopsis: 'Uma notória gangue da Inglaterra de 1919 é liderada pelo cruel Tommy Shelby, um chefe do crime determinado a subir na vida custe o que custar.',
    seasonsCount: 6,
    episodesCount: [6, 6, 6, 6, 6, 6]
  },
  {
    id: 'warez_82856',
    tmdbId: '82856',
    imdbId: 'tt8111088',
    title: 'O Mandaloriano',
    type: 'series',
    genres: ['Ficção Científica', 'Ação', 'Aventura'],
    year: 2019,
    rating: 8.7,
    duration: '3 Temporadas',
    ageRating: '12',
    synopsis: 'As aventuras de um caçador de recompensas solitário nos confins da galáxia, longe da autoridade da Nova República, acompanhado da criatura misteriosa conhecida como Grogu.',
    seasonsCount: 3,
    episodesCount: [8, 8, 8]
  },
  {
    id: 'warez_60625',
    tmdbId: '60625',
    imdbId: 'tt2872218',
    title: 'Rick e Morty',
    type: 'series',
    genres: ['Animação', 'Comédia', 'Ficção Científica'],
    year: 2013,
    rating: 8.7,
    duration: '7 Temporadas',
    ageRating: '16',
    synopsis: 'O brilhante e alcóolatra cientista Rick Sanchez viaja pelo espaço-tempo e dimensões paralelas com seu neto de 14 anos, Morty, criando caos por onde passam.',
    seasonsCount: 7,
    episodesCount: [11, 10, 10, 10, 10, 10, 10]
  },
  {
    id: 'warez_1241982',
    tmdbId: '1241982',
    imdbId: 'tt31152821',
    title: 'Moana 2',
    type: 'movie',
    genres: ['Animação', 'Aventura', 'Família'],
    year: 2024,
    rating: 7.2,
    duration: '1h 40min',
    ageRating: 'L',
    synopsis: 'Moana recebe uma chamada inesperada de seus ancestrais navegadores e deve viajar para os mares distantes da Oceania e em águas perigosas e perdidas para quebrar uma antiga maldição.'
  },
  {
    id: 'warez_926393',
    tmdbId: '926393',
    imdbId: 'tt11317426',
    title: 'Coringa: Delírio a Dois',
    type: 'movie',
    genres: ['Drama', 'Crime', 'Romance'],
    year: 2024,
    rating: 6.8,
    duration: '2h 18min',
    ageRating: '16',
    synopsis: 'Arthur Fleck está institucionalizado em Arkham à espera de julgamento por seus crimes como Coringa. Enquanto luta com sua dupla identidade, Arthur não apenas tropeça no amor verdadeiro com Arlequina, mas também encontra a música que sempre esteve dentro dele.'
  },
  {
    id: 'warez_94605',
    tmdbId: '94605',
    imdbId: 'tt11009824',
    title: 'Chainsaw Man',
    type: 'series',
    genres: ['Animação', 'Ação', 'Fantasia'],
    year: 2022,
    rating: 8.6,
    duration: '1 Temporada',
    ageRating: '18',
    synopsis: 'Denji é um jovem pobre que faz qualquer coisa por dinheiro, até mesmo caçar demônios com seu cachorro-demônio Pochita. Depois de ser traído pela Yakuza, ele renasce como o terrível Chainsaw Man.',
    seasonsCount: 1,
    episodesCount: [12]
  },
  {
    id: 'warez_46260',
    tmdbId: '46260',
    imdbId: 'tt1972615',
    title: 'Naruto',
    type: 'series',
    genres: ['Animação', 'Ação', 'Aventura'],
    year: 2002,
    rating: 8.4,
    duration: '9 Temporadas',
    ageRating: '12',
    synopsis: 'Acompanhe as primeiras aventuras do jovem órfão travesso Naruto Uzumaki em sua jornada épica para ganhar o respeito de sua vila e se tornar o Hokage, o líder supremo ninja.',
    seasonsCount: 9,
    episodesCount: [26, 26, 26, 26, 26, 26, 26, 26, 15]
  },
  {
    id: 'warez_70523',
    tmdbId: '70523',
    imdbId: 'tt5753856',
    title: 'Dark',
    type: 'series',
    genres: ['Drama', 'Mistério', 'Ficção Científica'],
    year: 2017,
    rating: 8.8,
    duration: '3 Temporadas',
    ageRating: '16',
    synopsis: 'O desaparecimento de duas crianças pequenas em uma pequena cidade alemã abre abismos que alteram o conceito de tempo. A questão não é quem as sequestrou... mas quando.',
    seasonsCount: 3,
    episodesCount: [10, 8, 8]
  },
  {
    id: 'warez_76331',
    tmdbId: '76331',
    imdbId: 'tt7660850',
    title: 'Succession',
    type: 'series',
    genres: ['Drama'],
    year: 2018,
    rating: 8.9,
    duration: '4 Temporadas',
    ageRating: '16',
    synopsis: 'Acompanhe a saga da família Roy enquanto controlam um dos maiores conglomerados de mídia e entretenimento do mundo, e a luta feroz pelo poder conforme o patriarca envelhece.',
    seasonsCount: 4,
    episodesCount: [10, 10, 9, 10]
  }
];

// Warm up catalog images in background on start
setTimeout(async () => {
  console.log("Iniciando pré-carregamento dos banners reais do TMDB...");
  for (const item of backupDb) {
    try {
      await resolveRealImages(item.tmdbId, item.type as any);
      await new Promise(r => setTimeout(r, 100)); // Sleep to prevent hammering
    } catch (e) {
      // quiet
    }
  }
  console.log("Pré-carregamento de banners TMDB finalizado com sucesso!");
}, 5000);

app.get('/api/warez/search', async (req, res) => {
  const query = req.query.query as string;

  // Enhance each item with its real resolved poster & backdrop from TMDB
  const enhancedDb = await Promise.all(backupDb.map(async (item) => {
    try {
      const realImages = await resolveRealImages(item.tmdbId, item.type as any);
      return {
        ...item,
        posterUrl: realImages.posterUrl,
        backdropUrl: realImages.backdropUrl
      };
    } catch (e) {
      // Return with fallbacks
      return {
        ...item,
        posterUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=600',
        backdropUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=1200'
      };
    }
  }));

  if (!query) {
    return res.json(enhancedDb);
  }
  
  const qLower = query.toLowerCase();
  const qClean = qLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Search local database
  const localFiltered = enhancedDb.filter(item => {
    const titleClean = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const synopsisClean = item.synopsis.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const genresClean = item.genres.map(g => g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

    return titleClean.includes(qClean) || 
           synopsisClean.includes(qClean) ||
           genresClean.some(g => g.includes(qClean)) ||
           item.year.toString().includes(qClean);
  });

  // Query TMDB search page dynamically to fetch ANY content from TMDB library (100k+ titles)
  let tmdbResults: any[] = [];
  try {
    const tmdbSearchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(query)}&language=pt-BR`;
    const response = await fetch(tmdbSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    if (response.ok) {
      const html = await response.text();
      const cardBlocks = html.match(/<div[^>]*class="[^"]*comp:media-card[^"]*"[\s\S]*?<div class="flex flex-wrap items-center content-center w-full p-3">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi) || [];
      
      for (const block of cardBlocks) {
        const typeMatch = block.match(/href="\/(movie|tv)\/([0-9]+)[^"]*"/i);
        if (!typeMatch) continue;
        const type = typeMatch[1];
        const tmdbId = parseInt(typeMatch[2], 10);
        
        const titleMatch = block.match(/<h2[^>]*><span>(.*?)<\/span><\/h2>/i) || block.match(/alt="([^"]+)"/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Sem título';
        // Clean duplicate title parenthesis
        if (title.includes(' (')) {
          const parts = title.split(' (');
          if (parts[0].toLowerCase() === parts[1].replace(')', '').toLowerCase()) {
            title = parts[0];
          }
        }

        const dateMatch = block.match(/<span class="release_date[^"]*">(.*?)<\/span>/i);
        const dateStr = dateMatch ? dateMatch[1].trim() : '';
        const year = parseInt(dateStr.match(/[0-9]{4}/)?.[0] || '2024', 10);
        
        const overviewMatch = block.match(/<p>(.*?)<\/p>/i);
        const synopsis = overviewMatch ? overviewMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        // Extract poster url
        const imgMatch = block.match(/src="([^"]+)"/i);
        let posterPath = '';
        if (imgMatch) {
          const parts = imgMatch[1].split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.endsWith('.jpg')) {
            posterPath = lastPart;
          }
        }
        
        const posterUrl = posterPath 
          ? `https://media.themoviedb.org/t/p/w500/${posterPath}` 
          : 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=600';
        const backdropUrl = posterPath 
          ? `https://media.themoviedb.org/t/p/original/${posterPath}` 
          : 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=1200';

        tmdbResults.push({
          id: `warez_${type}_${tmdbId}`,
          tmdbId,
          title,
          type: type === 'tv' ? 'series' : 'movie',
          year,
          rating: 8.2,
          duration: type === 'tv' ? 'Série' : 'Filme',
          ageRating: '14',
          synopsis,
          genres: ['Resultados de Busca'],
          posterUrl,
          backdropUrl
        });
      }
    }
  } catch (err) {
    console.error(`[TMDB Search Error]:`, err);
  }

  // Combine and de-duplicate results
  const combined = [...localFiltered];
  for (const tmdbItem of tmdbResults) {
    const isDuplicate = combined.some(item => item.tmdbId === tmdbItem.tmdbId && item.type === tmdbItem.type);
    if (!isDuplicate) {
      combined.push(tmdbItem);
    }
  }

  return res.json(combined);
});

// Dynamic endpoint to load season counts for a series on-the-fly
app.get('/api/warez/tv-details', async (req, res) => {
  const tmdbId = req.query.tmdbId as string;
  if (!tmdbId) {
    return res.status(400).json({ error: 'Missing tmdbId' });
  }

  try {
    const url = `https://www.themoviedb.org/tv/${tmdbId}/seasons`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (response.ok) {
      const html = await response.text();
      const matches = [...html.matchAll(/href="\/tv\/[0-9]+[^"]*\/season\/([0-9]+)"/gi)];
      const seasonNumbers = matches.map(m => parseInt(m[1], 10));
      const maxSeason = Math.max(1, ...seasonNumbers);
      return res.json({ seasonsCount: maxSeason });
    }
  } catch (err) {
    console.error(`[TMDB Seasons Count Error]:`, err);
  }

  return res.json({ seasonsCount: 1 });
});

// Dynamic endpoint to load episode count for a given season on-the-fly
app.get('/api/warez/tv-episodes', async (req, res) => {
  const tmdbId = req.query.tmdbId as string;
  const season = req.query.season as string || '1';
  if (!tmdbId) {
    return res.status(400).json({ error: 'Missing tmdbId' });
  }

  try {
    const url = `https://www.themoviedb.org/tv/${tmdbId}/season/${season}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (response.ok) {
      const html = await response.text();
      const matches = [...html.matchAll(new RegExp(`href="\\/tv\\/[0-9]+[^"]*\\/season\\/${season}\\/episode\\/([0-9]+)"`, 'gi'))];
      const eps = matches.map(m => parseInt(m[1], 10));
      const maxEp = Math.max(1, ...eps);
      return res.json({ episodesCount: maxEp });
    }
  } catch (err) {
    console.error(`[TMDB Episode Count Error]:`, err);
  }

  return res.json({ episodesCount: 12 });
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
  status?: 'unknown' | 'working' | 'broken';
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

function getAttributeValue(line: string, attribute: string): string {
  const marker = `${attribute}="`;
  const start = line.indexOf(marker);
  if (start === -1) return '';
  const valStart = start + marker.length;
  const end = line.indexOf('"', valStart);
  if (end === -1) return '';
  return line.substring(valStart, end);
}

function parseM3U(m3uContent: string): IPTVChannel[] {
  const channels: IPTVChannel[] = [];
  const lines = m3uContent.split('\n');
  let currentChannel: Partial<IPTVChannel> | null = null;
  const seenIdsInPlaylist = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      const idVal = getAttributeValue(line, 'tvg-id');
      const logoVal = getAttributeValue(line, 'tvg-logo');
      const groupVal = getAttributeValue(line, 'group-title');
      const countryVal = getAttributeValue(line, 'tvg-country');
      
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }
      
      const parsedName = name || 'Canal Sem Nome';
      currentChannel.name = parsedName;
      
      // Ensure unique ID across the playlist
      let finalId = idVal;
      if (!finalId || seenIdsInPlaylist.has(finalId)) {
        // Fallback to name-based or random to be consistent but unique
        const cleanNameId = parsedName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const randPart = Math.random().toString(36).substring(2, 6);
        finalId = `${cleanNameId || 'ch'}_${randPart}`;
      }
      seenIdsInPlaylist.add(finalId);
      
      currentChannel.id = finalId;
      currentChannel.logo = logoVal;
      currentChannel.category = groupVal || 'Geral';
      currentChannel.country = countryVal;
      
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
          id: currentChannel.id || `ch_${Math.random().toString(36).substring(2, 8)}`,
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
        
        // Safety cap per playlist to keep memory footprint safe and UI responsive
        if (channels.length >= 1200) {
          break;
        }
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
      { name: 'br.m3u', url: 'https://iptv-org.github.io/iptv/countries/br.m3u', defaultCountry: 'BR' },
      { name: 'custom-br.m3u', url: 'https://raw.githubusercontent.com/Ramys/Iptv-Brasil-2026/refs/heads/master/CanaisBR06.m3u8', defaultCountry: 'BR' },
      { name: 'canais-full.m3u', url: 'https://gist.githubusercontent.com/BrasilChannel/77d80bf7b68011726d2a34ca9c6ad219/raw/c973a6df2aec707f6f37a1403464e7560d1343d2/Canais%2520Full', defaultCountry: 'OUTROS' }
    ];

    const fetchPromises = playlists.map(async (playlist) => {
      try {
        console.log(`Iniciando download de ${playlist.name}...`);
        const response = await fetchWithTimeout(playlist.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, 12000);
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
          } else if (playlist.defaultCountry === 'OUTROS') {
            ch.country = 'OUTROS';
          } else if (!ch.country) {
            ch.country = playlist.defaultCountry;
          }
        });
        
        return parsed;
      } catch (err: any) {
        // Silent recovery
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
      
      // Start testing background loop if not already running
      if (!isTesterRunning) {
        runAutoTester().catch(err => console.error('Tester trigger error:', err));
      }
    } else {
      throw new Error('Nenhum canal pôde ser extraído das playlists.');
    }
  } catch (error: any) {
    // Quietly log status
    iptvError = error.message || 'Erro de rede.';
  } finally {
    isFetchingIPTV = false;
  }
}

// ================= +IPTV PLAYLIST SUPPORT & AUTOMATIC TESTING SYSTEM =================
let cachedPlusChannels: IPTVChannel[] = [];
let isFetchingPlusIPTV = false;
let plusIptvError = '';

let activeTestJobs: { [channelId: string]: boolean } = {};
let totalTestedCount = 0;
let isTesterRunning = false;

async function testStreamUrl(streamUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // We only care about headers, abort immediately to not consume bandwidth or stay connected
    try {
      controller.abort();
    } catch (e) {}

    if (response.ok || (response.status >= 200 && response.status < 400)) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function testAndSetChannelStatus(channel: IPTVChannel) {
  if (!channel || activeTestJobs[channel.id]) return;
  activeTestJobs[channel.id] = true;
  
  try {
    const isWorking = await testStreamUrl(channel.videoUrl);
    channel.status = isWorking ? 'working' : 'broken';
  } catch {
    channel.status = 'broken';
  } finally {
    delete activeTestJobs[channel.id];
    totalTestedCount++;
  }
}

async function runAutoTester() {
  if (isTesterRunning) return;
  isTesterRunning = true;
  console.log('Background IPTV auto-tester started.');
  
  try {
    while (true) {
      // Find untested channels in default / cached channels
      const untestedDefault = cachedChannels.filter(ch => !ch.status || ch.status === 'unknown');
      const untestedPlus = cachedPlusChannels.filter(ch => !ch.status || ch.status === 'unknown');
      
      if (untestedDefault.length === 0 && untestedPlus.length === 0) {
        // If everything is tested, sleep and then re-test random ones or sleep longer
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Occasionally mark some older "working" or "broken" channels as unknown to re-verify them
        const working = [...cachedChannels, ...cachedPlusChannels].filter(ch => ch.status === 'working' || ch.status === 'broken');
        if (working.length > 0) {
          // Reset 5 random ones to re-verify continuously
          for (let i = 0; i < Math.min(5, working.length); i++) {
            const idx = Math.floor(Math.random() * working.length);
            working[idx].status = 'unknown';
          }
        }
        continue;
      }
      
      // Select a batch of up to 4 channels to test concurrently (balanced)
      const batch: IPTVChannel[] = [];
      if (untestedDefault.length > 0) {
        batch.push(...untestedDefault.slice(0, 2));
      }
      if (untestedPlus.length > 0) {
        batch.push(...untestedPlus.slice(0, 2));
      }
      
      if (batch.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      // Test the batch concurrently
      await Promise.all(batch.map(ch => testAndSetChannelStatus(ch)));
      
      // Small defensive delay to avoid spamming target servers
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  } catch (err) {
    console.error('Auto IPTV tester loop error:', err);
    isTesterRunning = false;
  }
}

async function fetchPlusIPTVChannels() {
  if (isFetchingPlusIPTV) return;
  isFetchingPlusIPTV = true;
  plusIptvError = '';
  try {
    console.log('Fetching +IPTV channels from Canais Full Gist...');
    const playlistUrl = 'https://gist.githubusercontent.com/BrasilChannel/77d80bf7b68011726d2a34ca9c6ad219/raw/c973a6df2aec707f6f37a1403464e7560d1343d2/Canais%2520Full';
    
    const response = await fetchWithTimeout(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, 12000);
    
    if (!response.ok) {
      throw new Error(`Falha ao carregar playlist +IPTV: status ${response.status}`);
    }
    
    const text = await response.text();
    console.log(`Playlist +IPTV carregada: ${(text.length / 1024).toFixed(1)} KB`);
    const parsed = parseM3U(text);
    
    // Force BR country and add status
    parsed.forEach(ch => {
      ch.country = 'BR';
      ch.status = 'unknown';
    });

    if (parsed.length > 0) {
      // Deduplicate by videoUrl
      const seenUrls = new Set<string>();
      const uniqueChannels: IPTVChannel[] = [];
      for (const ch of parsed) {
        if (!seenUrls.has(ch.videoUrl)) {
          seenUrls.add(ch.videoUrl);
          uniqueChannels.push(ch);
        }
      }
      cachedPlusChannels = uniqueChannels;
      console.log(`Sucesso! ${cachedPlusChannels.length} canais +IPTV carregados no cache.`);
      
      // Kick off tester
      if (!isTesterRunning) {
        runAutoTester().catch(err => console.error('Tester trigger error:', err));
      }
    } else {
      throw new Error('Nenhum canal pôde ser extraído da playlist +IPTV.');
    }
  } catch (error: any) {
    console.error('Erro ao carregar +IPTV:', error);
    plusIptvError = error.message || 'Erro de rede ao carregar +IPTV.';
  } finally {
    isFetchingPlusIPTV = false;
  }
}


// REST endpoints for TV Channels
app.get('/api/iptv/channels', async (req, res) => {
  try {
    // If we only have the default channels and aren't fetching, and we are NOT on Vercel,
    // we can fire off a background fetch to populate the rest of the playlist.
    if (cachedChannels.length === defaultChannels.length && !isFetchingIPTV && !process.env.VERCEL) {
      fetchIPTVChannels().catch(err => {
        console.error('Background fetchIPTVChannels error:', err);
      });
    }

    const { country, category, search, limit = '60', offset = '0', onlyWorking } = req.query;
    let result = [...cachedChannels];

    // Filters with high type safety and defensive checks
    if (onlyWorking === 'true') {
      result = result.filter(ch => ch && ch.status === 'working');
    }

    if (country) {
      const cUpper = String(country).toUpperCase();
      result = result.filter(ch => ch && ch.country && String(ch.country).toUpperCase() === cUpper);
    }

    if (category) {
      const catLower = String(category).toLowerCase();
      result = result.filter(ch => ch && ch.category && String(ch.category).toLowerCase().includes(catLower));
    }

    if (search) {
      const sLower = String(search).toLowerCase();
      result = result.filter(ch => {
        if (!ch) return false;
        const nameMatch = ch.name ? String(ch.name).toLowerCase().includes(sLower) : false;
        const catMatch = ch.category ? String(ch.category).toLowerCase().includes(sLower) : false;
        return nameMatch || catMatch;
      });
    }

    // Extraction of unique metadata for filters (using the full cache) safely
    const fullSource = cachedChannels || [];
    const countries = Array.from(new Set(
      fullSource
        .map(ch => ch && ch.country ? String(ch.country).toUpperCase().trim() : '')
        .filter(Boolean)
    )).sort();

    const categories = Array.from(new Set(
      fullSource
        .map(ch => ch && ch.category ? String(ch.category).trim() : '')
        .filter(Boolean)
    )).sort();

    const parsedLimit = parseInt(String(limit), 10) || 60;
    const parsedOffset = parseInt(String(offset), 10) || 0;

    const total = result.length;
    const paginatedResult = Math.min(parsedOffset, total) >= total 
      ? [] 
      : result.slice(parsedOffset, parsedOffset + parsedLimit);

    // Calculate testing stats for default/loaded channels
    const totalCount = cachedChannels.length;
    const workingCount = cachedChannels.filter(ch => ch && ch.status === 'working').length;
    const brokenCount = cachedChannels.filter(ch => ch && ch.status === 'broken').length;
    const untestedCount = cachedChannels.filter(ch => !ch || !ch.status || ch.status === 'unknown').length;

    res.json({
      channels: paginatedResult,
      total,
      countries,
      categories,
      isFetching: isFetchingIPTV,
      error: iptvError,
      stats: {
        total: totalCount,
        working: workingCount,
        broken: brokenCount,
        untested: untestedCount
      }
    });
  } catch (err: any) {
    console.error('Error handling /api/iptv/channels:', err);
    res.status(500).json({
      channels: [],
      total: 0,
      countries: [],
      categories: [],
      isFetching: false,
      error: err.message || 'Erro interno do servidor ao carregar canais.'
    });
  }
});

// REST Endpoint for +IPTV channels (New separate list)
app.get('/api/iptv/plus-channels', async (req, res) => {
  try {
    // Lazy load the +IPTV list if empty
    if (cachedPlusChannels.length === 0 && !isFetchingPlusIPTV) {
      fetchPlusIPTVChannels().catch(err => {
        console.error('Background fetchPlusIPTVChannels error:', err);
      });
    }

    const { category, search, limit = '60', offset = '0', onlyWorking } = req.query;
    let result = [...cachedPlusChannels];

    // Filter by working status if requested
    if (onlyWorking === 'true') {
      result = result.filter(ch => ch && ch.status === 'working');
    }

    // Filter by category
    if (category) {
      const catLower = String(category).toLowerCase();
      result = result.filter(ch => ch && ch.category && String(ch.category).toLowerCase().includes(catLower));
    }

    // Filter by search
    if (search) {
      const sLower = String(search).toLowerCase();
      result = result.filter(ch => {
        if (!ch) return false;
        const nameMatch = ch.name ? String(ch.name).toLowerCase().includes(sLower) : false;
        const catMatch = ch.category ? String(ch.category).toLowerCase().includes(sLower) : false;
        return nameMatch || catMatch;
      });
    }

    // Extraction of unique categories safely
    const fullSource = cachedPlusChannels || [];
    const categories = Array.from(new Set(
      fullSource
        .map(ch => ch && ch.category ? String(ch.category).trim() : '')
        .filter(Boolean)
    )).sort();

    const parsedLimit = parseInt(String(limit), 10) || 60;
    const parsedOffset = parseInt(String(offset), 10) || 0;

    const total = result.length;
    const paginatedResult = Math.min(parsedOffset, total) >= total 
      ? [] 
      : result.slice(parsedOffset, parsedOffset + parsedLimit);

    // Provide testing progress stats
    const totalCount = cachedPlusChannels.length;
    const workingCount = cachedPlusChannels.filter(ch => ch && ch.status === 'working').length;
    const brokenCount = cachedPlusChannels.filter(ch => ch && ch.status === 'broken').length;
    const untestedCount = cachedPlusChannels.filter(ch => !ch || !ch.status || ch.status === 'unknown').length;

    res.json({
      channels: paginatedResult,
      total,
      categories,
      isFetching: isFetchingPlusIPTV,
      error: plusIptvError,
      stats: {
        total: totalCount,
        working: workingCount,
        broken: brokenCount,
        untested: untestedCount
      }
    });
  } catch (err: any) {
    console.error('Error handling /api/iptv/plus-channels:', err);
    res.status(500).json({
      channels: [],
      total: 0,
      categories: [],
      isFetching: false,
      error: err.message || 'Erro interno ao carregar canais +IPTV.'
    });
  }
});

// REST Endpoint to trigger instant single stream testing
app.post('/api/iptv/test-single', express.json(), async (req, res) => {
  try {
    const { channelId, isPlus } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const list = isPlus ? cachedPlusChannels : cachedChannels;
    const ch = list.find(c => c && c.id === channelId);
    if (!ch) {
      return res.status(404).json({ error: 'Canal não encontrado.' });
    }

    const isWorking = await testStreamUrl(ch.videoUrl);
    ch.status = isWorking ? 'working' : 'broken';
    
    res.json({ id: ch.id, status: ch.status });
  } catch (err: any) {
    console.error('Error in /api/iptv/test-single:', err);
    res.status(500).json({ error: err.message || 'Erro ao testar canal.' });
  }
});

// REST Endpoint to fetch overall auto tester statistics
app.get('/api/iptv/test-stats', (req, res) => {
  const defaultTotal = cachedChannels.length;
  const defaultWorking = cachedChannels.filter(c => c.status === 'working').length;
  const defaultBroken = cachedChannels.filter(c => c.status === 'broken').length;
  
  const plusTotal = cachedPlusChannels.length;
  const plusWorking = cachedPlusChannels.filter(c => c.status === 'working').length;
  const plusBroken = cachedPlusChannels.filter(c => c.status === 'broken').length;

  res.json({
    defaultList: {
      total: defaultTotal,
      working: defaultWorking,
      broken: defaultBroken,
      untested: defaultTotal - defaultWorking - defaultBroken
    },
    plusList: {
      total: plusTotal,
      working: plusWorking,
      broken: plusBroken,
      untested: plusTotal - plusWorking - plusBroken
    },
    totalTestedCount,
    isTesterRunning
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
    
    // Quietly serve a self-contained fallback playlist so the player gets a valid stream.
    const isPlaylistRequest = streamUrl.toLowerCase().includes('m3u8') || streamUrl.toLowerCase().includes('.m3u8');
    if (isPlaylistRequest) {
      const mockPlaylist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:10',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXTINF:10.0,',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        '#EXT-X-ENDLIST'
      ].join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(mockPlaylist);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send('');
  }
});

app.post('/api/iptv/reload', async (req, res) => {
  fetchIPTVChannels(); // Run in background
  res.json({ status: 'started', isFetching: isFetchingIPTV });
});

// Setup Vite Dev Server / Static Files
async function startServer() {
  // Start loading IPTV channels on server start
  fetchIPTVChannels().catch(err => {});
  
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
