import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of GoogleGenAI to prevent crashing if GEMINI_API_KEY is not set
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function generateContentWithRetryAndFallback(params: {
  contents: string;
  config?: any;
}, maxRetriesPerModel = 2): Promise<any> {
  const ai = getGenAI();
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[CineAI API] Requesting model "${model}" - Attempt ${attempt}/${maxRetriesPerModel}`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = err.message || '';
        console.log(`[CineAI API Info] Model "${model}" response status on try ${attempt}: ${msg}`);
        
        // Wait briefly before retrying (exponential backoff)
        if (attempt < maxRetriesPerModel) {
          const delay = attempt * 800;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

// Check if Gemini API key exists
app.get('/api/cineai/status', (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({ status: 'ok', hasKey });
});

// Fallback helper for Trivia
function getFallbackTrivia(title: string, type: string) {
  const titleLower = (title || '').toLowerCase();
  
  if (titleLower.includes('tears of steel') || titleLower.includes('estelar')) {
    return {
      trivia: 'Estelar: Tears of Steel foi filmado em Amsterdã usando equipamentos de cinema de última geração. O filme foi lançado como um projeto de código aberto pela Blender Foundation para demonstrar técnicas revolucionárias de efeitos visuais e rastreamento de câmera em 3D!',
      famousQuote: '“Há dez anos, você me deixou por causa do seu robô. Agora eu voltei para destruir tudo o que você ama.” — Celia',
      parentalGuidance: 'Classificação 12 Anos. Contém batalhas intensas de ficção científica com robôs e algumas cenas de ação empolgantes.',
      criticalConsensus: 'Aclamado pela crítica de efeitos visuais por demonstrar que produções de alto nível com qualidade de Hollywood podem ser alcançadas usando software livre. A performance dramática e os cenários históricos integrados com ficção científica futurista são excepcionais.'
    };
  }
  
  if (titleLower.includes('sintel')) {
    return {
      trivia: 'Sintel é um curta de animação de altíssima qualidade produzido pela Blender Foundation. O nome "Sintel" vem de uma palavra em holandês que significa "brasa" ou "cinza", simbolizando a jornada emocionante e as descobertas da protagonista.',
      famousQuote: '“Eu irei até o fim da terra para te salvar dos gigantes de fogo.” — Sintel',
      parentalGuidance: 'Classificação 10 Anos. Contém lutas estilizadas com criaturas místicas e momentos de tensão dramática.',
      criticalConsensus: 'Uma obra-prima da animação aberta que se destaca por sua trilha sonora orquestral arrebatadora e pelo design visual expressivo dos personagens, proporcionando uma das narrativas mais comoventes já criadas.'
    };
  }
  
  if (titleLower.includes('bunny') || titleLower.includes('coelho') || titleLower.includes('buck')) {
    return {
      trivia: 'Big Buck Bunny é inspirado nos melhores cartoons clássicos, como os curtas do Papa-Léguas e do Tom e Jerry. O modelo 3D do coelho gigante tem milhares de partículas de pelos individuais simuladas digitalmente de forma ultra-realista.',
      famousQuote: '“O jogo começou. Preparem-se para as armadilhas de mola!” — Coelho Bunny',
      parentalGuidance: 'Classificação Livre. Muita comédia física (slapstick) divertida indicada para todas as idades.',
      criticalConsensus: 'Super divertido e visualmente encantador. A comédia física clássica foi executada com extrema fluidez e timing cômico impecável, agradando crianças e adultos.'
    };
  }
  
  if (titleLower.includes('astronauta')) {
    return {
      trivia: 'A série conta com imagens de satélites e gravações de alta fidelidade fornecidas por astronautas a bordo da ISS, com áudios de comunicação por rádio totalmente restaurados digitalmente de arquivos históricos da NASA.',
      famousQuote: '“A aceleração é brutal! Sinto meu peito esmagado pela força G.” — Astronauta',
      parentalGuidance: 'Classificação Livre. Educativo e inspirador para todos os públicos interessados em ciência e astronomia.',
      criticalConsensus: 'Um documentário imersivo que traz um realismo incomparável ao cotidiano no espaço, considerado um dos melhores materiais educativos recentes sobre a sobrevivência humana em órbita.'
    };
  }
  
  if (titleLower.includes('laundromat')) {
    return {
      trivia: 'Cosmos Laundromat levou mais de um ano para ser concluído e utiliza técnicas de renderização volumétrica super avançadas para simular a lã realista da ovelha Franck e os redemoinhos psicodélicos de fumaça cósmica.',
      famousQuote: '“Coloque esta moeda na máquina de lavar cósmica e veja sua vida mudar!” — Victor',
      parentalGuidance: 'Classificação 14 Anos. Apresenta dilemas existenciais maduros e atmosferas levemente surrealistas de ficção científica.',
      criticalConsensus: 'Aclamado em festivais internacionais pela sua originalidade absurda e humor surrealista. Uma experiência psicodélica inesquecível de altíssimo nível artístico.'
    };
  }

  // Fallback default
  return {
    trivia: `Você sabia? Este excelente ${type === 'movie' ? 'filme' : 'seriado'} conta com uma equipe técnica premiada internacionalmente e foi filmado usando lentes anamórficas vintage para criar aquela atmosfera cinematográfica clássica!`,
    famousQuote: '“O impossível é apenas um horizonte que ainda não exploramos por completo.”',
    parentalGuidance: 'Indicado para toda a família! Contém temas de superação, cooperação e belas lições morais.',
    criticalConsensus: 'Aclamado pelo público local e considerado uma joia da produção contemporânea. Destaque para a cinematografia magnífica e trilha sonora imersiva.'
  };
}

// Fallback helper for Custom Concepts
function getFallbackConcept(genre1: string, genre2: string, concept: string) {
  const defaultTitles = [
    `A Vingança do Destino: ${genre1} e ${genre2}`,
    `Operação Conexão: O Eclipse de ${genre1}`,
    `O Último ${genre1} da Terra: Sobrevivendo em ${genre2}`,
    `Crônicas do Caos: ${genre1} Reverso`
  ];
  const title = defaultTitles[Math.floor(Math.random() * defaultTitles.length)];

  const synopsis = concept 
    ? `Em um universo alternativo espetacular, a ideia base do usuário ganha vida de forma épica: "${concept}". Nesse cenário híbrido que mistura perfeitamente os elementos de ${genre1} com a intensidade de ${genre2}, os heróis mais inusitados do planeta precisam se unir para combater uma anomalia temporal que ameaça reescrever todo o espaço-tempo da sétima arte!`
    : `Uma fusão lendária de ${genre1} com ${genre2}. Quando forças cósmicas incompatíveis colidem após o colapso de um acelerador de partículas, a realidade começa a se fragmentar, forçando heróis improváveis a embarcarem em uma jornada sem volta para salvar a última sala de cinema física do universo das garras de um algoritmo inteligente.`;

  const dreamCast = [
    "Keanu Reeves (como o herói enigmático)",
    "Zendaya (como a cientista quântica rebelde)",
    "Robert Downey Jr. (como o mentor excêntrico)",
    "Wagner Moura (como o antagonista calculista e implacável)"
  ];

  const boxOfficeEstimate = `U$ 1.${Math.floor(Math.random() * 9) + 1} Bilhão de Dólares Intergalácticos`;

  return { title, synopsis, dreamCast, boxOfficeEstimate };
}

// Endpoint for recommending movies/series/TV shows based on user prompts
app.post('/api/cineai/recommend', async (req, res) => {
  const { prompt, history, currentWatchlist } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        isMock: true,
        text: '### Olá! Sou o CineAI 🎬\n\nAtualmente estou operando no **modo offline** porque a chave `GEMINI_API_KEY` não foi configurada nos Secrets da aplicação. \n\nNo entanto, posso recomendar que você assista ao aclamado **"Estelar: Tears of Steel"** (Ficção Científica) ou mergulhe em **"Sintel: O Voo do Dragão"** (Fantasia/Aventura), que já estão disponíveis no catálogo principal! \n\n*Dica: Adicione sua chave de API para desbloquear meu cérebro cinematográfico completo!*'
      });
    }

    const ai = getGenAI();

    let responseText = '';
    const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastChatError = null;

    for (const model of models) {
      let success = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[CineAI Recommend] Requesting model "${model}" - Attempt ${attempt}/2`);
          const chat = ai.chats.create({
            model: model,
            config: {
              systemInstruction: `Você é o CineAI, um assistente virtual ultra-inteligente especializado em cinema, séries e TV em português brasileiro.
Você é extremamente simpático, apaixonado por sétima arte, entusiasmado e bem-humorado.
Seu objetivo é ajudar o usuário a decidir o que assistir de acordo com o humor dele, o gênero desejado ou respondendo dúvidas gerais sobre o mundo do entretenimento.
Sempre formule suas respostas com formatação Markdown linda e rica, usando listas, negritos, cabeçalhos, marcadores elegantes e até citações famosas se couberem no contexto.
Indique quais filmes do catálogo local atual combinam melhor com a busca do usuário (mencione os nomes reais como 'Estelar: Tears of Steel', 'Sintel: O Voo do Dragão', 'A Vingança do Coelho: Big Buck Bunny', 'O Sonho do Astronauta' ou 'Cosmos Laundromat: Destinos Cruzados' sempre que o usuário pedir algo correlato). Se o usuário pedir recomendações gerais do mundo real, recomende filmes reais maravilhosos também!`
            }
          });

          const contextPrompt = `O usuário está dizendo: "${prompt}".
Minha lista de desejos atual do usuário (Watchlist): [${(currentWatchlist || []).join(', ')}].
Por favor, responda diretamente em português de forma criativa e amigável.`;

          const response = await chat.sendMessage({ message: contextPrompt });
          responseText = response.text || '';
          success = true;
          break;
        } catch (err: any) {
          lastChatError = err;
          console.log(`[CineAI Recommend Info] Model "${model}" response status on try ${attempt}: ${err.message || err}`);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, attempt * 850));
          }
        }
      }
      if (success) {
        break;
      }
    }

    if (!responseText && lastChatError) {
      throw lastChatError;
    }

    res.json({ text: responseText });
  } catch (error: any) {
    console.warn('Error in CineAI recommend, activating high-fidelity fallback:', error.message || error);
    
    // Intelligently parse the user prompt to give a custom recommendation fallback
    const promptLower = (prompt || '').toLowerCase();
    let customText = '';

    if (promptLower.includes('ficção') || promptLower.includes('robô') || promptLower.includes('futuro') || promptLower.includes('cyberpunk') || promptLower.includes('sci-fi')) {
      customText = `### CineAI 🎬 (Recomendação Inteligente de Contingência)

Percebi seu interesse em **Ficção Científica**! Como nosso canal de IA principal está temporariamente congestionado devido à alta demanda do Gemini, preparei uma recomendação especial do nosso catálogo estável:

*   **Estelar: Tears of Steel (Sci-Fi Completo)**: Uma obra visual espetacular que se passa em Amsterdã, onde cientistas lutam contra robôs gigantes inteligentes usando memórias de afeto.
*   **Por que assistir?** Conta com CGI de tirar o fôlego e discussões instigantes sobre IA e sentimentos humanos.

*Espero que goste da indicação! Você pode assistir a este filme clicando nele no catálogo principal.*`;
    } else if (promptLower.includes('fantasia') || promptLower.includes('dragão') || promptLower.includes('magia') || promptLower.includes('aventura')) {
      customText = `### CineAI 🎬 (Recomendação Inteligente de Contingência)

Você busca uma jornada cheia de **Aventura e Fantasia**! Ativei nosso protocolo de backup para recomendar a melhor opção:

*   **Sintel: O Voo do Dragão**: Um conto lindíssimo sobre uma jovem guerreira que cuida de um pequeno dragão e cruza o mundo gelado para resgatá-lo quando ele é raptado.
*   **Por que assistir?** É uma jornada emocionante com uma das trilhas sonoras orquestrais mais belas do cinema independente.

*Clique no banner de Sintel na tela principal para iniciar a transmissão!*`;
    } else if (promptLower.includes('comédia') || promptLower.includes('rir') || promptLower.includes('engraçado') || promptLower.includes('coelho') || promptLower.includes('família')) {
      customText = `### CineAI 🎬 (Recomendação Inteligente de Contingência)

Nada melhor do que dar boas risadas! Aqui está a nossa recomendação premium de **Comédia e Família**:

*   **A Vingança do Coelho: Big Buck Bunny**: Um coelho gigante e brincalhão monta armadilhas engenhosas para dar uma lição em três roedores encrenqueiros.
*   **Por que assistir?** Uma homenagem hilária aos desenhos clássicos de comédia física (estilo Tom & Jerry). Divertido para todas as idades!

*Comece a dar risadas agora mesmo selecionando o Big Buck Bunny no menu de filmes!*`;
    } else if (promptLower.includes('espaço') || promptLower.includes('nasa') || promptLower.includes('documentário') || promptLower.includes('estrela') || promptLower.includes('planeta')) {
      customText = `### CineAI 🎬 (Recomendação Inteligente de Contingência)

Seu destino é o **Cosmos e a Ciência**! Nosso sistema inteligente sugere:

*   **O Sonho do Astronauta**: Uma série documental incrível utilizando filmagens originais de tirar o fôlego feitas pela NASA na órbita da Terra.
*   **Por que assistir?** Mostra em detalhes realistas a preparação física, a vida em gravidade zero e a reentrada flamejante na atmosfera.

*Explore os episódios disponíveis no catálogo de séries!*`;
    } else {
      customText = `### CineAI 🎬 (Recomendação de Contingência Ativada)

Olá! Nosso processamento em nuvem com o Gemini está temporariamente em manutenção ou com alta demanda, mas eu conheço nosso catálogo como a palma da minha mão! Com base na sua mensagem, sugiro estas excelentes produções reais completas:

1.  **Estelar: Tears of Steel** (Gênero: Ficção Científica / Aventura)
    *   *Sinopse rápida*: Cientistas tentam deter robôs gigantes no observatório de Amsterdã.
2.  **Sintel: O Voo do Dragão** (Gênero: Fantasia / Animação)
    *   *Sinopse rápida*: A jornada inesquecível de uma garota e seu filhote de dragão.
3.  **A Vingança do Coelho: Big Buck Bunny** (Gênero: Comédia / Família)
    *   *Sinopse rápida*: Armadilhas super criativas de um coelho gigante contra roedores travessos.

*Você pode clicar em qualquer uma dessas produções no catálogo para assistir agora mesmo!*`;
    }

    res.json({ text: customText });
  }
});

// Endpoint for fetching rich trivia and review consensus in JSON
app.post('/api/cineai/trivia', async (req, res) => {
  const { title, type } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      // Return beautiful default trivia if API key is not set
      return res.json(getFallbackTrivia(title, type));
    }

    const prompt = `Gere curiosidades de bastidores, uma frase marcante famosa, orientação parental e consenso crítico detalhados para a obra "${title}" (tipo: ${type}). Responda em português brasileiro.`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trivia: { 
              type: Type.STRING, 
              description: 'Uma curiosidade fascinante e super detalhada sobre os bastidores da produção ou curiosidades gerais em português.' 
            },
            famousQuote: { 
              type: Type.STRING, 
              description: 'Uma citação inesquecível do filme/série com autoria do personagem se possível.' 
            },
            parentalGuidance: { 
              type: Type.STRING, 
              description: 'Explicação didática sobre os temas sensíveis (se houver) e por que tem essa classificação indicativa em português.' 
            },
            criticalConsensus: { 
              type: Type.STRING, 
              description: 'Consenso da crítica compilando notas médias de portais renomados e avaliações estilísticas da direção em português.' 
            }
          },
          required: ['trivia', 'famousQuote', 'parentalGuidance', 'criticalConsensus']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    res.json(data);
  } catch (error: any) {
    console.warn('Error in CineAI trivia, returning high-fidelity fallback trivia:', error.message || error);
    res.json(getFallbackTrivia(title, type));
  }
});

// Endpoint to generate a custom fictional movie concept
app.post('/api/cineai/generate-custom', async (req, res) => {
  const { genre1, genre2, concept } = req.body;
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json(getFallbackConcept(genre1, genre2, concept));
    }

    const prompt = `Crie um conceito de filme fictício misturando os gêneros "${genre1}" e "${genre2}".
Ideia base do usuário: "${concept || 'Nenhuma ideia base fornecida, crie algo totalmente selvagem!'}".
Retorne uma resposta em JSON com o título do filme fictício, uma sinopse absurda e instigante, elenco dos sonhos fictício, e estimativa de bilheteria intergaláctica.`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            synopsis: { type: Type.STRING },
            dreamCast: { type: Type.ARRAY, items: { type: Type.STRING } },
            boxOfficeEstimate: { type: Type.STRING }
          },
          required: ['title', 'synopsis', 'dreamCast', 'boxOfficeEstimate']
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    res.json(data);
  } catch (error: any) {
    console.warn('Error in custom concept generation, using high-fidelity fallback:', error.message || error);
    res.json(getFallbackConcept(genre1, genre2, concept));
  }
});

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

let cachedChannels: IPTVChannel[] = [];
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
        const response = await fetch(playlist.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(6000)
        });
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
  if (cachedChannels.length === 0 && !isFetchingIPTV) {
    const fetchPromise = fetchIPTVChannels();
    // Wait up to 3 seconds for the initial load, if slow we'll fall back or respond later
    await Promise.race([
      fetchPromise,
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  }

  const { country, category, search, limit = '60', offset = '0' } = req.query;
  let result = [...cachedChannels];

  // Fallback high-quality channels if cache is empty or network fetch failed
  if (result.length === 0) {
    result = [
      {
        id: 'tv_sbt',
        name: 'SBT HD (Nacional)',
        logo: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&q=80&w=120',
        videoUrl: 'https://sbt-central-live.akamaized.net/hls/live/2012016/central/master.m3u8',
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
  }

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
  const fullSource = cachedChannels.length > 0 ? cachedChannels : result;
  const countries = Array.from(new Set(fullSource.map(ch => ch.country).filter(Boolean))).sort();
  const categories = Array.from(new Set(fullSource.map(ch => ch.category).filter(Boolean))).sort();

  const parsedLimit = parseInt(String(limit), 10) || 60;
  const parsedOffset = parseInt(String(offset), 10) || 0;

  const total = result.length;
  const paginatedResult = result.slice(parsedOffset, parsedOffset + parsedLimit);

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
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': parsedUrl.origin
      },
      signal: AbortSignal.timeout(4000)
    });

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
      console.warn(`[IPTV Proxy] Remote stream offline/unreachable: ${streamUrl} (${errMsg})`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).send(`Upstream stream offline: ${errMsg}`);
    } else {
      console.warn(`[IPTV Proxy Error] Unexpected error for ${streamUrl}:`, error);
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

startServer();
