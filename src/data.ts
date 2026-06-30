export interface Subtitle {
  time: number; // in seconds
  end: number;
  textPt: string;
  textEn: string;
}

export interface VideoContent {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'tv';
  genres: string[];
  year: number;
  rating: number; // e.g. 4.8
  duration: string; // "2h 15min" or "8 Episódios"
  ageRating: 'L' | '10' | '12' | '14' | '16' | '18';
  synopsis: string;
  director?: string;
  cast: string[];
  backdropUrl: string;
  posterUrl: string;
  videoUrl: string;
  subtitles?: Subtitle[];
  episodes?: {
    id: string;
    title: string;
    duration: string;
    videoUrl: string;
    synopsis: string;
  }[];
}

export const MOVIES_AND_SERIES: VideoContent[] = [
  {
    id: '1',
    title: 'Estelar: Tears of Steel (Sci-Fi Completo)',
    type: 'movie',
    genres: ['Ficção Científica', 'Aventura', 'Ação'],
    year: 2024,
    rating: 4.8,
    duration: '12min (Filme Completo)',
    ageRating: '12',
    synopsis: 'Um filme real de ficção científica completo onde cientistas no observatório do Oude Kerk em Amsterdã tentam salvar o planeta de uma invasão iminente de robôs gigantes inteligentes usando memórias virtuais de amor.',
    director: 'Ian Hubert',
    cast: ['Derek de Lint', 'Rogier Schippers', 'Denise Rebergen', 'Jody Bhe'],
    backdropUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&q=80&w=1200',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    subtitles: [
      { time: 1, end: 4, textPt: "[Celia] Há dez anos, você me deixou por causa do seu robô.", textEn: "[Celia] Ten years ago, you left me because of your robot." },
      { time: 5, end: 9, textPt: "[Celia] Agora eu voltei para destruir tudo o que você ama.", textEn: "[Celia] Now I've come back to destroy everything you love." },
      { time: 10, end: 14, textPt: "[Cientista] Ativar canhão de plasma gravitacional agora mesmo!", textEn: "[Scientist] Activate gravitational plasma cannon right now!" },
      { time: 15, end: 20, textPt: "[Celia] O tempo do homem biológico acabou. As máquinas assumiram o controle.", textEn: "[Celia] The time of the biological man has ended. The machines have taken control." }
    ]
  },
  {
    id: '2',
    title: 'Sintel: O Voo do Dragão (Filme Completo)',
    type: 'movie',
    genres: ['Fantasia', 'Aventura', 'Animação'],
    year: 2025,
    rating: 4.9,
    duration: '15min (Filme Completo)',
    ageRating: '10',
    synopsis: 'Filme épico de animação que conta a comovente jornada de Sintel, uma jovem guerreira solitária que resgata um pequeno filhote de dragão. Quando o dragão é capturado por uma criatura monstruosa e adulta, ela inicia uma implacável busca pelo topo do mundo.',
    director: 'Colin Levy',
    cast: ['Halina Reijn', 'Thom Hoffman'],
    backdropUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200',
    posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    subtitles: [
      { time: 2, end: 6, textPt: "[Sintel] Onde está você, meu pequeno amigo?", textEn: "[Sintel] Where are you, my little friend?" },
      { time: 7, end: 12, textPt: "[Dragão] *Sons de aspas batendo e rosnado amigável*", textEn: "[Dragon] *Flapping wing sounds and friendly growl*" },
      { time: 14, end: 19, textPt: "[Sintel] Eu irei até o fim da terra para te salvar dos gigantes de fogo.", textEn: "[Sintel] I will go to the end of the earth to save you from the fire giants." }
    ]
  },
  {
    id: '3',
    title: 'A Vingança do Coelho: Big Buck Bunny (Comédia Completa)',
    type: 'movie',
    genres: ['Comédia', 'Família', 'Animação'],
    year: 2024,
    rating: 4.7,
    duration: '10min (Filme Completo)',
    ageRating: 'L',
    synopsis: 'Um clássico da comédia onde um coelho gigante e de bom coração decide bolar uma série de armadilhas geniais e hilárias no estilo "Esqueceram de Mim" para se vingar de três roedores arruaceiros que destruíram suas flores favoritas.',
    director: 'Sacha Goedegebure',
    cast: ['Vozes de Efeitos Sonoros'],
    backdropUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=1200',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    subtitles: [
      { time: 1, end: 5, textPt: "[Uma borboleta amigável voa ao redor da cabeça do coelho]", textEn: "[A friendly butterfly flies around the rabbit's head]" },
      { time: 6, end: 11, textPt: "[Esquilo Frank começa a arremessar sementes e rir maliciosamente]", textEn: "[Frank the Squirrel begins throwing seeds and laughing maliciously]" },
      { time: 12, end: 18, textPt: "[Coelho Bunny] O jogo começou. Preparem-se para as armadilhas de mola!", textEn: "[Bunny the Rabbit] The game is on. Get ready for the spring traps!" }
    ]
  },
  {
    id: '4',
    title: 'O Sonho do Astronauta (Série de Espaço)',
    type: 'series',
    genres: ['Documentário', 'Espaço', 'Curiosidades'],
    year: 2025,
    rating: 4.8,
    duration: '3 Episódios',
    ageRating: 'L',
    synopsis: 'Uma série espetacular com filmagens reais da NASA e da Estação Espacial Internacional mostrando a rotina desafiadora e fascinante dos seres humanos em órbita da Terra.',
    director: 'Jonathan Nolan',
    cast: ['Neil Armstrong Archive', 'Chris Hadfield', 'Peggy Whitson'],
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    episodes: [
      { id: '4x1', title: 'Episódio 1: Decolagem e Sobrevivência', duration: '12min', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', synopsis: 'Acompanhe a enorme força gravitacional exercida sobre os astronautas durante os primeiros minutos de ascensão ao espaço e a transição para a microgravidade.' },
      { id: '4x2', title: 'Episódio 2: A Estação Espacial', duration: '15min', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', synopsis: 'Como se dorme, come e faz exercícios em gravidade zero? Explore os laboratórios suspensos a 400km de altitude.' },
      { id: '4x3', title: 'Episódio 3: O Retorno Flamejante', duration: '11min', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', synopsis: 'A reentrada na atmosfera terrestre dentro de uma cápsula de metal suportando temperaturas de milhares de graus Celsius.' }
    ],
    subtitles: [
      { time: 1, end: 5, textPt: "[Controlador] Propulsores principais ativados. Cinco, quatro, três...", textEn: "[Controller] Main thrusters activated. Five, four, three..." },
      { time: 6, end: 10, textPt: "[Astronauta] A aceleração é brutal! Sinto meu peito esmagado pela força G.", textEn: "[Astronauta] The acceleration is brutal! I feel my chest crushed by the G-force." }
    ]
  },
  {
    id: '5',
    title: 'Cosmos Laundromat: Destinos Cruzados (Curta Completo)',
    type: 'movie',
    genres: ['Ficção Científica', 'Fantasia', 'Mistério'],
    year: 2024,
    rating: 4.9,
    duration: '10min (Completo)',
    ageRating: '14',
    synopsis: 'Em uma ilha deserta no meio do oceano, uma ovelha deprimida chamada Franck tenta dar fim à sua vida melancólica até que um homem misterioso e extravagante chamado Victor aparece e lhe oferece uma lavagem de cérebro cósmica, transportando sua mente para diferentes mundos de forma psicodélica.',
    director: 'Mathieu Auvray',
    cast: ['Pierre Bokma', 'Reinout Scholten van Aschat'],
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200',
    posterUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', // Real dynamic video
    subtitles: [
      { time: 1, end: 5, textPt: "[Franck] Nada faz sentido neste pasto sem fim.", textEn: "[Franck] Nothing makes sense in this endless pasture." },
      { time: 6, end: 11, textPt: "[Victor] Coloque esta moeda na máquina de lavar cósmica e veja sua vida mudar!", textEn: "[Victor] Insert this coin into the cosmic washing machine and watch your life change!" }
    ]
  }
];

export interface LiveChannel {
  id: string;
  name: string;
  logo: string;
  videoUrl: string; // m3u8 HLS streams reais de canais públicos do Brasil
  category: 'Filmes' | 'Notícias' | 'Esportes' | 'Documentários' | 'Infantil';
  nowPlaying: string;
  nextShow: string;
  ticker: string[];
  country?: string;
}

export const LIVE_CHANNELS: LiveChannel[] = [
  {
    id: 'tv_record_news',
    name: 'Record News (Notícias ao Vivo)',
    logo: '📰',
    videoUrl: 'https://recordnews-r7-aws.sambatech.com.br/live/smil:rn.smil/playlist.m3u8', // Link real HLS da Record News oficial
    category: 'Notícias',
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
    logo: '📺',
    videoUrl: 'https://sbt-live.akamaized.net/hls/live/2012016/sbt/master.m3u8', // Novo link m3u8 real de transmissão do SBT
    category: 'Filmes',
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
    logo: '🏛️',
    videoUrl: 'https://ebctvlive3.ebc.com.br/hls/tvbrasil1.m3u8', // Sinal nacional público do governo (altamente estável)
    category: 'Documentários',
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
    logo: '🎨',
    videoUrl: 'https://stream.tvcultura.com.br/cultura/live/playlist.m3u8', // Link m3u8 oficial da conceituada TV Cultura paulista
    category: 'Documentários',
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
    logo: '🎙️',
    videoUrl: 'https://live-jpn.jovempan.com.br/hls/live.m3u8', // Transmissão oficial ao vivo Jovem Pan News
    category: 'Notícias',
    nowPlaying: 'Os Pingos nos Is (Opinião)',
    nextShow: 'Jornal da Manhã - Edição Resumo (22:00)',
    ticker: [
      'JOVEM PAN NEWS: Transmissão oficial ao vivo com debates acalorados sobre política',
      'Previsão do Tempo: Frente fria avança na região Sul e causa pancadas de chuva',
      'Interatividade total: Mande sua pergunta usando a hashtag do programa oficial.'
    ]
  }
];
