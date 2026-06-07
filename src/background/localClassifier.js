// ═══════════════════════════════════════════════════════════════════════════════
// Local Keyword-Based Classification (fallback when Gemini is unavailable)
// ═══════════════════════════════════════════════════════════════════════════════

function classifyLocally(transcriptText, videoTitle, channelName) {
  const fullText = `${videoTitle} ${channelName} ${transcriptText}`.toLowerCase();

  const eduPatterns = [
    { words: [
      // Programming & CS
      'algorithm', 'data structure', 'programming', 'coding', 'javascript', 'python',
      'react', 'nodejs', 'typescript', 'api', 'database', 'frontend', 'backend',
      'fullstack', 'devops', 'git', 'github', 'debugging', 'compiler', 'runtime',
      'framework', 'library', 'npm', 'webpack', 'docker', 'kubernetes', 'aws',
      'azure', 'cloud computing', 'machine learning', 'deep learning', 'neural network',
      'artificial intelligence', 'natural language processing', 'computer vision',
      'tensorflow', 'pytorch', 'sql', 'nosql', 'mongodb', 'redis', 'linux',
      'command line', 'terminal', 'bash', 'shell script', 'object oriented',
      'functional programming', 'recursion', 'binary tree', 'linked list', 'hash map',
      'sorting algorithm', 'dynamic programming', 'big o notation', 'software engineering',
      'system design', 'microservices', 'html', 'css', 'dom', 'java ', 'c++', 'rust',
      'golang', 'swift', 'kotlin', 'flutter', 'android development', 'ios development',
      'web development', 'app development',
      // New: expanded CS & AI
      'graphql', 'rest api', 'websocket', 'ci cd', 'continuous integration',
      'nextjs', 'svelte', 'angular', 'vue', 'django', 'flask', 'spring boot',
      'express', 'ruby on rails', 'laravel', 'assembly language', 'regex',
      'design patterns', 'solid principles', 'clean code', 'refactoring',
      'unit test', 'integration test', 'postgresql', 'elasticsearch',
      'terraform', 'ansible', 'jenkins', 'nginx', 'computer networking',
      'tcp ip', 'http protocol', 'dns', 'encryption', 'hashing', 'oauth',
      'data pipeline', 'etl', 'data warehouse', 'apache spark', 'pyspark', 'hadoop',
      'large language model', 'llm', 'prompt engineering', 'langchain',
      'retrieval augmented', 'fine tuning', 'generative ai', 'transformer model',
      'attention mechanism', 'opencv', 'object detection', 'sentiment analysis',
      'reinforcement learning', 'supervised learning', 'unsupervised learning',
      'cybersecurity', 'blockchain'
    ], weight: 3 },
    { words: [
      // Science
      'physics', 'chemistry', 'biology', 'astronomy', 'quantum', 'thermodynamics',
      'electromagnetism', 'molecule', 'atom', 'periodic table', 'evolution', 'genetics',
      'dna', 'cell biology', 'microbiology', 'neuroscience', 'ecology', 'climate science',
      'organic chemistry', 'inorganic chemistry', 'biochemistry', 'pharmacology',
      'astrophysics', 'cosmology', 'geological', 'paleontology', 'scientific method',
      'hypothesis', 'experiment', 'peer review', 'research paper',
      // New: expanded science
      'photosynthesis', 'mitosis', 'meiosis', 'osmosis', 'molecular biology',
      'anatomy', 'physiology', 'immune system', 'natural selection', 'taxonomy',
      'biodiversity', 'black hole', 'dark matter', 'relativity', 'string theory',
      'particle physics', 'nuclear physics', 'radioactivity', 'electromagnetic spectrum',
      'plate tectonics', 'meteorology', 'oceanography', 'environmental science',
      'renewable energy', 'sustainability', 'greenhouse effect'
    ], weight: 3 },
    { words: [
      // Math
      'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability',
      'linear algebra', 'differential equation', 'integral', 'derivative', 'matrix',
      'vector', 'mathematical proof', 'theorem', 'mathematical', 'equation',
      'polynomial', 'logarithm', 'exponential', 'number theory', 'discrete math',
      'combinatorics',
      // New: expanded math
      'complex number', 'graph theory', 'set theory', 'boolean algebra',
      'numerical methods', 'fourier transform', 'laplace transform', 'topology',
      'binomial theorem', 'permutation', 'standard deviation', 'regression',
      'correlation', 'hypothesis testing', 'bayesian', 'optimization'
    ], weight: 3 },
    { words: [
      // Humanities & Social Sciences
      'history of', 'economics', 'political science', 'philosophy', 'sociology',
      'psychology', 'anthropology', 'archaeology', 'linguistics', 'literature analysis',
      'critical thinking', 'logical fallacy', 'cognitive bias', 'behavioral economics',
      'macroeconomics', 'microeconomics', 'supply and demand', 'monetary policy',
      'fiscal policy', 'constitutional', 'civil rights', 'world war',
      'industrial revolution', 'renaissance', 'enlightenment', 'ancient civilization',
      'geopolitics',
      // New: expanded humanities
      'cold war', 'colonialism', 'imperialism', 'nationalism', 'democracy',
      'communism', 'socialism', 'capitalism explained', 'game theory',
      'international relations', 'diplomacy', 'ethics', 'moral philosophy',
      'epistemology', 'metaphysics', 'existentialism', 'stoicism',
      'cognitive psychology', 'developmental psychology', 'social psychology',
      'criminology', 'forensic science', 'legal studies', 'human rights',
      'cultural studies', 'art history', 'film studies', 'music theory'
    ], weight: 2 },
    { words: [
      // Professional, Business & Finance
      'business strategy', 'management', 'finance', 'accounting', 'marketing strategy',
      'product management', 'project management', 'agile', 'scrum', 'design thinking',
      'ux design', 'ui design', 'user research', 'wireframe', 'prototype', 'figma',
      'photoshop', 'illustrator', 'graphic design', 'typography', 'color theory',
      'branding', 'public speaking', 'presentation skills', 'leadership', 'negotiation',
      'entrepreneurship', 'startup', 'venture capital', 'investment', 'stock market',
      'portfolio', 'financial analysis', 'data analysis', 'data science',
      'visualization', 'excel', 'power bi', 'tableau',
      // New: expanded professional
      'personal finance', 'budgeting', 'compound interest', 'retirement planning',
      'index fund', 'mutual fund', 'tax planning', 'financial literacy',
      'credit score', 'debt management', 'value investing', 'dividend investing',
      'resume writing', 'interview preparation', 'career advice', 'time management',
      'communication skills', 'emotional intelligence', 'supply chain management',
      'operations management', 'lean manufacturing', 'six sigma', 'risk management'
    ], weight: 2 },
    { words: [
      // Language & Exam Prep
      'language learning', 'grammar', 'vocabulary', 'pronunciation', 'conjugation',
      'verb tense', 'sentence structure', 'reading comprehension', 'writing skills',
      'essay writing', 'ielts', 'toefl', 'gre', 'english lesson', 'spanish lesson',
      'french lesson', 'german lesson', 'japanese lesson', 'chinese lesson',
      'korean lesson',
      // New: expanded language & exam
      'hindi lesson', 'arabic lesson', 'portuguese lesson', 'italian lesson',
      'russian lesson', 'idioms', 'phrasal verbs',
      'exam preparation', 'board exam', 'entrance exam', 'competitive exam',
      'jee preparation', 'neet preparation', 'upsc', 'gate exam',
      'sat preparation', 'gmat preparation', 'ap exam',
      'dissertation', 'thesis writing', 'research methodology', 'academic writing'
    ], weight: 2 },
    { words: [
      // Medicine & Engineering
      'medical', 'medicine', 'pharmacology', 'pathology', 'cardiology', 'neurology',
      'oncology', 'dermatology', 'orthopedics', 'radiology', 'surgery', 'clinical',
      'diagnosis', 'epidemiology', 'public health', 'vaccine', 'immunology',
      'nutrition science', 'first aid', 'cpr training', 'nursing',
      'civil engineering', 'mechanical engineering', 'electrical engineering',
      'electronics', 'circuit design', 'arduino', 'raspberry pi', 'embedded systems',
      'iot', 'cad', '3d modeling', 'solidworks', 'autocad', 'matlab',
      'fluid mechanics', 'material science', 'aerospace engineering', 'robotics',
      'automation', 'signal processing', 'control systems', 'vlsi', 'fpga',
      'semiconductor', 'biomedical engineering', 'chemical engineering'
    ], weight: 3 },
    { words: [
      // General education signals
      'tutorial', 'explained', 'how to', 'step by step', 'beginner guide',
      'advanced guide', 'complete guide', 'crash course', 'full course', 'free course',
      'lesson', 'lecture', 'masterclass', 'workshop', 'certification', 'exam prep',
      'study guide', 'documentation', 'overview', 'fundamentals', 'introduction to',
      'basics of', 'deep dive', 'in-depth', 'comprehensive',
      // New: expanded signals
      'cheat sheet', 'roadmap', 'learning path', 'curriculum', 'best practices',
      'case study', 'technical review', 'code review', 'hands on', 'practical guide',
      'project based', 'build from scratch', 'live coding', 'code walkthrough'
    ], weight: 1 }
  ];

  const entertainmentPatterns = [
    { words: [
      'vlog', 'day in my life', 'get ready with me', 'grwm', 'haul', 'unboxing',
      'reaction', 'reacting to', 'try not to laugh', 'prank', 'challenge accepted',
      'mukbang', 'asmr', 'storytime', 'drama alert', 'celebrity gossip', 'tea spill',
      'exposed', 'cancelled', 'beef', 'roast', 'diss track', 'music video',
      'official video', 'lyrics', 'remix', 'cover song', 'karaoke', 'dance challenge',
      'tiktok', 'shorts', 'compilation', 'funny moments', 'fail compilation', 'meme',
      'satisfying', 'oddly satisfying', 'relaxing', 'sleep music', 'lo-fi', 'ambient',
      // New: expanded entertainment
      'bass boosted', 'slowed reverb', 'mashup', 'live performance', 'rap',
      'bloopers', 'outtakes', 'stand up comedy', 'cringe compilation',
      'tier list', 'ranking', 'top 10', 'iceberg explained',
      'giveaway', 'face reveal', 'transformation', 'glow up',
      '24 hour challenge', 'last to leave', 'gone wrong', 'went wrong',
      'extreme', 'insane', 'impossible'
    ], weight: -3 },
    { words: [
      'bollywood', 'tollywood', 'kollywood', 'movie scene', 'movie clip', 'trailer',
      'teaser', 'behind the scenes', 'red carpet', 'award show', 'reality show',
      'game show', 'dating show', 'talent show', 'netflix', 'amazon prime', 'hotstar',
      'disney plus', 'web series', 'k-drama', 'anime episode', 'manga',
      // New: expanded shows
      'hbo max', 'hulu', 'peacock', 'paramount plus', 'apple tv',
      'movie review', 'film review', 'binge watch', 'movie recap',
      'ending explained', 'fan theory', 'easter eggs', 'scene pack', 'fancam',
      'nollywood', 'telenovela'
    ], weight: -3 },
    { words: [
      'hookup', 'relationship advice', 'couple goals', 'boyfriend', 'girlfriend',
      'wedding', 'proposal', 'baby shower', 'gender reveal', 'family vlog',
      'pet video', 'cute animals', 'dog video', 'cat video', 'travel vlog',
      'room tour', 'house tour', 'car tour', 'luxury', 'rich life', 'flex',
      'shopping spree', 'outfit of the day', 'fashion haul', 'makeup tutorial',
      'skincare routine', 'workout routine', 'gym vlog', 'what i eat in a day',
      // New: expanded lifestyle
      'morning routine', 'night routine', 'thrift haul', 'try on haul',
      'apartment tour', 'life update', 'q&a', 'ask me anything',
      'breakup', 'caught cheating', 'love triangle', 'dating tips',
      'food review', 'street food', 'food challenge', 'eating challenge',
      'taste test', 'restaurant review',
      'recipe', 'cooking', 'biryani', 'mutton', 'chicken fry', 'village cooking',
      'how to cook', 'homemade', 'meal prep', 'baking', 'kebab', 'tandoori',
      'ghost', 'haunted', 'paranormal', 'creepypasta', 'conspiracy theory',
      'astrology', 'horoscope', 'tarot reading', 'psychic'
    ], weight: -2 }
  ];

  const eduChannels = [
    '3blue1brown', 'khan academy', 'crashcourse', 'veritasium', 'vsauce', 'minutephysics',
    'numberphile', 'computerphile', 'kurzgesagt', 'ted-ed', 'ted', 'fireship', 'traversy media',
    'the coding train', 'cs dojo', 'freecodecamp', 'web dev simplified', 'net ninja',
    'academind', 'programming with mosh', 'corey schafer', 'sentdex', 'techworld with nana',
    'mit opencourseware', 'stanford', 'harvard', 'yale courses', 'nptel',
    'brilliant', 'organic chemistry tutor', 'professor leonard', 'patrickjmt',
    'edx', 'coursera', 'udemy', 'pluralsight',
    'smarter every day', 'real engineering', 'practical engineering', 'two minute papers',
    'yannic kilcher', 'lex fridman', 'computerphile', 'linus tech tips',
    // Expanded channels
    'professor dave explains', 'sci show', 'asap science', 'minuteearth',
    'the action lab', 'nilered', 'periodic videos', 'sabine hossenfelder',
    'pbs space time', 'fermilab', 'domain of science', 'up and atom',
    'steve mould', 'dr mike', 'ninja nerd', 'osmosis',
    'neetcode', 'theo', 'jack herrington', 'kevin powell', 'the primeagen',
    'clement mihailescu', 'codewithharry', 'apna college', 'love babbar',
    'striver', 'take u forward', 'gate smashers', 'abdul bari',
    'javascript mastery', 'developedbyed', 'caleb curry', 'hitesh choudhary',
    'arjan codes', 'dreams of code', 'ben eater', 'sebastian lague',
    'statquest', 'krish naik', 'codebasics', 'daniel bourke',
    'matthew berman', 'ai explained', 'cgp grey', 'real life lore',
    'not just bikes', 'polymatter', 'wendover', 'economics explained',
    'oversimplified', 'kings and generals', 'johnny harris', 'vox',
    'tom scott', 'mark rober', 'ali abdaal', 'thomas frank',
    'graham stephan', 'the plain bagel', 'patrick boyle',
    'networkchuck', 'david bombal', 'john savill',
    'the futur', 'neso academy', 'geeksforgeeks'
  ];

  let score = 0;
  const lowerChannel = channelName.toLowerCase();

  if (eduChannels.some(ch => lowerChannel.includes(ch))) {
    score += 10;
  }

  for (const group of eduPatterns) {
    for (const word of group.words) {
      if (fullText.includes(word)) {
        score += group.weight;
      }
    }
  }

  for (const group of entertainmentPatterns) {
    for (const word of group.words) {
      if (fullText.includes(word)) {
        score += group.weight;
      }
    }
  }

  const isEducational = score >= 2;
  const confidence = Math.min(1, Math.abs(score) / 15);

  return {
    isEducational,
    confidence,
    reason: isEducational
      ? `Local analysis: educational score ${score} (keywords matched)`
      : `Local analysis: non-educational score ${score}`,
    method: 'local-keyword',
    score
  };
}
