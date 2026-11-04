// Verbal Memory (Human Benchmark rules). Words appear one at a time: tap SEEN if it was shown
// before in this game, NEW if not. 3 lives; a wrong answer costs one. No time limit.
// Each turn: the first word is always new; afterwards a coin flip picks a random never-shown word
// (50%) or a random already-shown word (50%), and the same word never appears twice in a row
// (HB re-flips until the word differs). Score = number of correct answers (HB's points).
// HB draws new words from a 109k-word dictionary; this game uses ~4,000 everyday words.
(() => {
  // Everyday, family-friendly English words (4–10 letters), filtered and checked by hand.
  const WORDS = `
    abandoned ability able about above abroad absence absent absolute absorption abstract academic academy
    accent accept acceptable acceptance access accessible accessory accident accomplish accordance according
    account accuracy accurate accused achieve acid acne acoustic acquire acre acrobat across acting action
    activated activation active activists activity actor actress acts actual acute adapted added adding addition
    additional address adds adequate adjacent adjust adjustable adjustment admission admit adolescent adopt
    adoption advance advantage adventure adverse advert advertise advice advise advisor advocacy advocate aerial
    aerospace affect affiliated affiliates afford afraid after afternoon afterwards again against aged agency
    agenda agent ages aggressive aging agree agreement ahead aimed aims aircraft airline airplane airport alarm
    album alert algebra algorithms alias alien alike alive alleged allergy alliance allow allowance almost alone
    along alpha alpine already also alter alternate although alto aluminum alumni always amateur amazing
    ambassador amber ambient amend amendment amenities amino among amongst amount analysis analyst analyze
    anatomy anchor ancient angel anger angle angry animal animated animation annex announce annoying annual
    anonymous another answer antenna antibody antique anybody anymore anyone anything anytime anyway anywhere
    apart apartment apparatus apparel apparent appeal appear appearance appendix apple appliance applicants
    apply appointed appraisal appreciate approach approval approve aqua aquarium aquatic arbitrary arbor arcade
    arch architect archives arctic area arena argue argument arise armor arms army around arrange array arrival
    arrive arrow arthritis article artificial artist artistic arts artwork asbestos aside asked asking asks
    aspect assembled assembly assess assessment asset assign assignment assist assistance assistant associate
    assume assumption assurance assure asthma astronomy asylum athletes athletic atlas atmosphere atom atomic
    attach attachment attempt attend attendance attention attitude attorney attract attraction attractive
    attribute auction audience audio audit auditor august aurora authentic author authority authorized auto
    automated automatic automobile automotive autumn available avatar avenue average aviation avoid award aware
    awareness away awesome awful axis baby bachelor back background backup bacon bacteria bacterial badge badly
    bags baker baking balance bald ball ballet balloon ballot banana band bank banned banner barely bargain barn
    barrel barrier bars base baseball basement basic basically basin basis basket basketball bass batch bath
    bathroom battery battle beach beads beam bean bear beast beat beautiful beauty became because become bedroom
    beds beef been before began begin beginner begun behalf behavior behavioral behind being belief believe bell
    belly belong below belt bench bend beneath beneficial benefit bent berry beside best beta better between
    beverage beyond bias bible biblical bicycle bidder bidding bids bigger biggest bike bill billion binary bind
    biography biological biology bird birth birthday bishop bite bits bizarre black blackberry blade blame blank
    blanket blast blend bless blind blink block blond blonde bloom blow blue board boat body bold bolt bond bone
    bonus book bookmark bookstore boom boost boot booth border bored boring born boss both bottle bottom bought
    boulder boulevard bound boundary bouquet boutique bowl boxed boxes boxing boys bracelet bracket brain brake
    branch brand brass brave breach bread break breakdown breakfast breath breed brick bridal bride bridge brief
    bright brilliant bring broad broadcast brochure broke broken bronze brook brother brought brown browse brush
    bubble buck buddy budget buffalo buffer bugs build built bulk bull bulletin bumper bunch bundle bunny burden
    bureau burn burst buses bush business busy butler butter butterfly button buyer buying buys buzz cabin
    cabinet cable cache cafe cage cake calcium calculate calculator calendar call calm came camel camera camp
    campaign campus canal cancel candidate candle candy cannon canvas canyon capable capacity cape capital
    capitol caps captain capture carbon card cardiac care careful cargo carnival carol carpet carrier carry cars
    cart cartoon cartridge casa case cash cassette cast castle casual catalog catalogue catalyst catch category
    catering cathedral cats cattle caught cause caution cave cedar ceiling celebrate celebrity cell cellular
    cement census cent central centre century ceramic ceremony certain certified chain chair chairman challenge
    chamber champion chance chancellor change channel chaos chapel chapter character charge charitable charity
    charm chart chase chassis chat cheap check checkout cheers cheese chef chemical chemistry cheque cherry
    chess chest chicken chief child childhood children chip chocolate choice choir choose chorus chose chosen
    chrome chronic chronicle chuck church cinema circle circuit circular circus citation cite citizen city civic
    civil civilian claim clan clarity class classic classical classified classroom clause clay clean cleanup
    clear clearance clerk click client cliff climate climb clinic clinical clip clock clone close closure cloth
    cloud cloudy club clusters coach coal coalition coast coastal coat code coffee coin cold collapse collar
    colleague collect collection collective collector college cologne colon colonial colony color colour column
    columnists combine combo come comedy comfort comic command comment commentary commerce commercial commission
    commit commitment committee commodity common community compact companion company comparable compare
    comparison compatible compete competent complaint complete completion complex complexity compliant comply
    component composed composer composite compound compressed compromise compute concept concern concert
    conclude conclusion concord concrete condition condo conduct conference confidence confident confirm
    conflict confused confusion congress connect connection conscious consensus consent consider consistent
    consists console consortium conspiracy constant constitute construct consult consultant consumer contact
    contain content contest context continent continue continuity continuous contract contractor contrary
    contrast contribute control controller convenient convention conversion convert convinced cook cookbook
    cookie cool coordinate cope copper copy copyright coral cord cordless core cork corn corporate corps correct
    correction corruption cosmetic cost costume cottage cotton could council counsel count country county couple
    coupon courage courier course court courtesy cove coverage cowboy crack cradle craft crash cream create
    creation creative creativity creator creature credit creek crest crew cricket crisis criteria criterion
    critical criticism critics crop cross crossword crowd crown crucial crude cruise crystal cube cubic cuisine
    cultural culture cumulative cups cure curious currency current curriculum curve custody custom cute cuts
    cutting cycle cylinder daddy daily dairy daisy dale damage dame dance danger dangerous dare dark darkness
    dash data database date daughter dawn days deaf deal dealt dean dear debate debt debut decade decent decide
    decision deck declare decline decor decorating decorative decreased dedicated deemed deep deer default
    defeat defects defence defend defendant defense defensive deferred deficit define definitely definition
    degree delay delegation delete delicious delight deliver delivery delta deluxe demand demo democracy
    democratic denial dense density dental dentists deny department departure depend dependent deposit depot
    depth deputy derby descending describe desert deserve design designated desirable desire desk desktop
    desperate despite destiny destroy detail detect detection detective detector determine develop deviation
    device devoted diagnosis diagnostic diagram dial dialogue diameter diamond diary dice dictionary diesel diet
    differ difference different difficult difficulty digest digit digital dimension dining dinner diploma direct
    direction directive director directory dirt disability disable disagree disaster disc discharge discipline
    disclose disclosure disco discount discover discovery discrete discretion discuss discussion dish disk
    disorder dispatch display disposal dispute distance distant distinct distribute district disturbed dive
    divide divine division dock doctor doctrine document dodge does dogs doing doll dollar domain dome domestic
    dominant donate donation done donor door dosage dose double doubt down download downtown dozen draft drag
    dragon drain drainage drama dramatic draw drawn dream dress drew dried drill drink drive driven drop drove
    drum dryer dual duck dude duke dump duplicate durable duration during dust duty dynamic each eagle earl
    earlier earliest early earn earrings ears earth earthquake ease easier east eastern easy eating ebony echo
    eclipse ecological economic economy edge edit edition editor editorial educated education educators effect
    effective efficiency efficient effort eggs eight either elder elect election electoral electric electrical
    electro electronic elegant element elementary elephant elevation eleven eligible eliminate elite else
    elsewhere embassy embedded emerald emergency emission emotional emotions emperor emphasis empire empirical
    employ employee employment empty enable enclosed encounter encourage encryption endangered ended ending
    endless ends enemy energy engage engagement engine enhance enjoy enormous enough enquiries enrolled
    enrollment ensemble ensure enter enterprise entire entitled entity entrance entry envelope enzyme epic
    episode equal equality equation equipment equipped equity equivalent error escape especially essay essence
    essential establish estate estimate estimation eternal ethical ethics ethnic evaluate evaluation even event
    eventually ever every everybody everyday everyone everything everywhere evidence evident evolution exact
    exam examine example exceed excel excellence excellent except exception excess excessive exchange excited
    excitement exciting excluded excluding exclusion exclusive excuse executive exempt exemption exercise
    exhaust exhibit exhibition exist existence exit exotic expand expansion expect expense expensive experience
    experiment expert expertise expiration expired expires explain explicitly explore export exposed exposure
    express expression extend extension extensive extent exterior external extra extract extraction extreme eyed
    eyes fabric fabulous face facilitate facility fact factor factory faculty fail failure fair fairy faith fake
    fall fallen false fame familiar family famous fancy fans fantastic fantasy fare farm fashion fast fate
    father fault favor favorite favour fear feat feature federal federation feed feedback feel fees feet fell
    fellow fellowship felt female fence ferry festival fever fewer fiber fibre fiction field fifteen fifth fifty
    fight figure file fill film filter final finance financial find fine finger finish fire fireplace firm first
    fish fist fitness fits fitted fitting five fixed fixes fixtures flag flame flash flat flavor fleece fleet
    flex flexible flight flip float flood floor floppy floral florist flour flow fluid flush flux flyer flying
    foam focal focus fold folk follow font food fool foot footage football footwear forbidden force foreign
    forest forestry forever forge forget forgot forgotten fork form formal format formation formula fort forth
    fortune forty forum forward fossil foster fought foul found foundation fountain four fourth fraction
    fragrance frame framework franchise frank free freedom freelance freeze freight frequency frequent fresh
    fridge friend friendship frog from front frontier frost frozen fruit fuel full fully function functional
    fund funk funky funny furnished furniture further fusion future fuzzy gain galaxy gale gallery game gamma
    gaps garage garbage garden garlic gasoline gate gateway gather gauge gave gear geek gender gene genealogy
    general generate generation generator generic generous genesis genetic genius genome genre gentle gentleman
    gently genuine geographic geography geological geology geometry gets getting ghost giant gift girl give
    given glad glance glass glen global globe glory gloves glow glucose gnome goal goat goes going gold golden
    golf gone good gorgeous gospel gossip gothic gotten gourmet governing government governor grab grace grade
    gradually graduate graduation grain grammar grams grand grant graphic graphs grass grateful gravity gray
    great green greenhouse greeting grew grey grid griffin grill grip grocery groove gross ground group grove
    grow grown growth guarantee guard guardian guess guest guidance guide guidelines guild guitar gulf guru guys
    habitat habits hack hair half hall halo hammer hand handbags handbook handle handy hang happen happiness
    happy harbor harbour hard hardware harm harmful harmony harvest hats have haven hawk hazard hazardous head
    headline headphones headset healing health healthy hear heard heart heat heath heaven heavy heel height held
    helicopter hello helmet help helpful hence herald herb herbal here hereby herein heritage hero herself
    hidden hide hierarchy high highland highlight highway hiking hill himself hint hire historic historical
    history hits hitting hobby hockey hold hole holiday hollow holly holy home homeless hometown homework honest
    honey honor hood hook hope hopefully horizon horizontal horn horrible horror horse hose hospital host hostel
    hotel hour house household however huge hull human humanity humidity humor hundred hung hungry hunt
    hurricane hurt husband hybrid hydraulic hydrogen hygiene icon idea ideal identical identify identity idle
    idol ignore illegal illness image imagine immediate immigrants immune impact impaired imperial implement
    implied implies import importance important impose impossible impressed impression impressive improve
    incentive inch incidence incident include income incomplete incorrect increase incredible incurred indeed
    index indicate indication indicator indigenous individual indoor induced induction industrial industry
    infant infinite inflation influence info inform informal infrared inherited initial initiated initiative
    injection inner innocent innovation innovative input inquiry insects insert insertion inside insight
    inspection inspector inspired install instance instant instead institute instructor instrument insulation
    insulin insurance insured intake integral integrate integrity intend intense intensity intensive intent
    intention interact interest interface interior internal internship interstate interview into introduce
    invalid invention inventory invest investment investors invisible invitation invite invoice involve iron
    irrigation island isolated isolation issue item itself ivory jack jacket jade jaguar jazz jean jeep jersey
    jets jewel jewelry jobs join joint joke journal journalism journalist journey judge judgment judicial juice
    jump junction jungle junior junk jury just justice justify juvenile karma keen keep kept keyboard keys kick
    kidney kids kilometers kind king kingdom kitchen kitty knee knew knight knit knock know knowledge known
    label labor laboratory labour labs lace lack ladder laden lady laid lake lamb lambda lamp lance land
    landscape lane language laptop large laser last late latitude latter laugh launch laundry lawn laws lawsuit
    lawyer layer layout lazy lead leadership leaf league lean learn lease least leather leave lecture left
    legacy legal legend legendary legitimate legs leisure lemon lending length lens less lesson lets letter
    letting level levy liability liable liberal liberty librarian library licence license lies life lifestyle
    lifetime lift light lightning like likelihood likewise lime limit limitation limousines line linear link
    lion lips liquid list listen literacy literally literary literature litigation little live livestock load
    loan lobby local locale locate location locator lock lodge logged logic logical logistics logo logs lone
    long longitude look loop loose lord lose loss lost lots loud lounge love lower lowest lows luck lucky
    luggage lunch lung luxury lyrics machine machinery made madness magazine magic magical magnet magnetic
    magnitude maiden mail mailman main mainland maintain major majority make makeup male mall manage management
    mandate mandatory manner manor manual many maple mapping maps marathon marble march margin marina marine
    maritime mark market marriage married marsh martial marvel mask mason mass massive master match mate
    material maternity math matrix mats matter mattress maximize maximum maybe mayor meal mean meaningful meant
    meanwhile measure meat mechanical mechanics mechanism medal media medical medication medicine medieval
    meditation medium meet member membership membrane memo memorial memory mental mention mentor menu merchant
    mercury mercy mere merger merit merry mesa mesh mess message messenger metal metallic meter method metric
    metro mice micro microphone microwave middle midnight might mighty migration mild mile mileage military milk
    mill millennium million mime mind mine mineral mini miniature minimal minimize minimum minister ministry
    minor minority mint minus minute miracle mirror miss mission mistake mixed mixer mixing mixture mobile
    mobility mode model modem moderator modern modified module moisture mold molecular molecules moment momentum
    moms monetary money monitor monkey mono monster month mood moon moral more moreover morning mortality
    mortgage moss most motel mother motion motivated motivation motor motorcycle mount mountain mouse mouth move
    movement movers movie much multimedia multiple muscle museum music musical musician must mustang mutual
    myrtle myself mysterious mystery myth nail name narrative narrow nasty nation national native natural nature
    naval navigate navigation navigator navy near nearby necessary necessity neck necklace need needle negative
    neighbor neither neon nerve nervous nest network neural neutral never newest newly news newsletter newspaper
    next nice nick nickel nickname night nightmare nine nitrogen noble nobody node noise nominated nomination
    none noon norm normal north northeast northern northwest nose note notebook nothing notice notify notion
    novel novelty nowhere nuclear null number numerous nurse nursery nutrition nuts nylon oaks oasis object
    objective obligation observe obtain obvious occasion occasional occupation occupied occur occurrence ocean
    odds offense offensive offer office official offset offshore often oils okay older oldest olive omega once
    ones ongoing onion only onto oops open opera operate operation operator opinion opponent opposed opposite
    opposition optimum option optional oracle oral orange orbit orchestra order ordinance ordinary organ organic
    organisms organize oriented origin original other otherwise ought ours ourselves outcome outdoor outer
    outlet outline outlook outside oval oven over overall overcome overhead overnight overseas overview owned
    owner ownership owns oxygen ozone pace pacific pack package packet pads page paid paint pair palace pale
    palm panel panic pants paper paperback parade paradise paragraph parallel parameters parent parental parish
    park parliament part partial particle particular partner party pass passage passenger passion passive
    passport password past pasta paste pastor patch patent path pathology patient patio patrol pattern pavilion
    payable paying payment payroll pays peace peaceful peak pearl peas pediatric peer penalty pencil pendant
    pending penguin peninsula penny pens pension people pepper perceived percent percentage perception perfect
    perform perfume perhaps period periodic peripheral permanent permission permit persistent person personal
    personnel pest petite petition petroleum pets phantom pharmacy phase phenomenon philosophy phone photo
    photograph phrase physical physician physics physiology piano pick pickup picnic picture piece pierce pike
    pillow pilot pine ping pink pins pioneer pipe pipeline pirates pitch pixels pizza place placement plain
    plaintiff plan plane planet planner plant plasma plastic plate platform platinum play plaza pleasant please
    pleasure pledge plenty plot plug plumbing plus pocket poem poet poetry point polar pole police policy polish
    political politics poll pollution polo poly polyester pond pool poor pope popular popularity population
    porcelain pork port portable portal portfolio portion portrait pose position positive possess possession
    possible possibly post postage postal postcard potato potential potter pottery poultry pound pour poverty
    powder power powerful practical practice prairie praise pray preceding precious precise precision predict
    prefer preference prefix premier premiere premises premium prepare prescribed presence present preserve
    president press pressure pretty prevent prevention preview previous price pride priest primary prime prince
    princess principal principle print prior priority privacy private privilege prize probably probe problem
    procedure proceed process processors produce product production productive profession professor profile
    profit program programme progress prohibited project projection projector prominent promise promote
    promotion prompt proof proper property prophet proportion proposal propose pros prospect protect protection
    protective protein protest protocol prototype proud prove proven provide providence provinces provision
    proxy psychiatry psychology public publicity publish pull pulse pump punch punk pupils puppy purchase pure
    purple purpose purse pursuant pursue pursuit push puts putting puzzle quad qualify quality quantity quantum
    quarter queen query quest question queue quick quiet quilt quit quite quiz quizzes quote rabbit race radar
    radiation radical radio radius rage raid rail railroad rain rainbow raise rally ranch rand random range rank
    rapid rare rate rather ratio rational rats rays reach reaction read ready real realistic reality realize
    realm realty rear reason reasonable reasonably rebate rebel rebound recall receipt receive recent reception
    recipe recipient recognize recommend record recover recovery recreation recruiting recycling redeem reduce
    reduction reed reef reel refer reference referral refined reflect reflection reform refresh refugees refund
    refuse regard regardless reggae regime region regional register registrar registry regular regulated
    regulation reject relate relation relative relax relaxation relay release relevance relevant reliable
    reliance relief religion religious reload relocation rely remain remainder remark remarkable remedy remember
    remind remote removal remove render renew renewal rent rental repair repeat replace replica reply report
    repository represent republic reputation request require rescue research reserve reset residence resident
    resist resistance resistant resolution resolve resort resource respect respond response rest restaurant
    restore restrict result resume retail retailers retain retired retirement retreat retrieval retrieve retro
    return reunion reveal revelation revenue reverse review revised revisions revolution reward rhythm ribbon
    rice rich ride ridge right ring ripe rise risk river riverside road robin robot robust rock rocket rocky
    role roll romantic roof room roommate root rope rose roster rotary rotation rouge rough round route routine
    rover rows royal royalty rubber ruby rugby rule runner running runs rural rush sacred sacrifice safari safe
    safety sage said sail saint sake salad salary sale salmon salon salt salvation same sample sand sandwich
    sandy sapphire satellite satin satisfy sauce savannah save saying says scale scan scanner scared scary
    scenario scene scenic schedule scheme scholar school science scientific scientist scoop scope score scout
    scratch screen script scroll scuba sculpture seafood seal search seas season seasonal seat second secondary
    secret secretary section sector secure security seed seeing seek seem seen sees segment select selection
    selective self sell semester semi seminar senate senator send senior sense sensitive sensor sent sentence
    separate separation sequence serial series serious serum serve service session sets setting settle
    settlement setup seven seventh several severe sewing shade shadow shake shall shame shape share shark sharp
    shed sheep sheer sheet shelf shell shelter shepherd sheriff shield shift shine ship shipment shirt shock
    shoe shoot shop shopper shore short shot should show showcase shown shut shuttle sick side sight sigma sign
    signal signature silence silent silk silly silver similar simple simply simulation since sing single sink
    sister site sitting situated situation sixth size skating skiing skill skin skip skirt sleep sleeve slide
    slight slim slip slope slot slow small smart smell smile smoke smooth snake snap snapshot snow soap soccer
    social society sociology socket socks sodium sofa soft softball software soil solar sold soldier sole solid
    solo solution solve some somebody somehow someone something sometimes somewhat somewhere song sons soon
    sorry sort sought soul sound soup source south southeast southern southwest space span spare spas spatial
    speak spears special specialist specialty species specific specify spectrum speech speed spell spend spent
    sphere spice spider spies spin spine spirit spiritual split spoke spoken spokesman sponsor sport spot
    spotlight spouse spray spread spring sprint squad square stability stable stack stadium staff stage
    stainless stake stamp stand standard star start state statement statewide static station stationery
    statistics status statute stay steady steam steel steering stem step stereo sterling stick sticky still
    stock stomach stone stood stop storage store storm story straight strain strand strange strap strategic
    strategy stream street strength strengthen stress stretch strict strike string strip stroke strong struck
    structural structure struggle stuck student studio study stuff stunning style stylish subject subjective
    sublime submit subsidiary substance substitute subtle suburban succeed success successful such sudden
    sufficient sugar suggest suggestion suit suitable suite summary summer summit sunglasses sunny sunrise
    sunset sunshine super superb superior supervisor supplement supplier supply support suppose supreme sure
    surf surface surge surgeon surgery surgical surname surplus surprise surround survey survival survive
    survivor suspected suspended suspension sustained swap sweet swift swim swing switch symbol sympathy
    symphony symptoms sync syndicate syndrome synthesis synthetic system systematic table tablet tabs tackle
    tactics tagged tags tail take taken tale talent talk tall tank tape target task taste tattoo taught taxes
    taxi teach team tear technical technician technique technology teddy teen teenage teeth telephone telescope
    television tell temple temporary tenant tend tennis tension tent term terminal terrace terrain terrible
    territory test testament testimony text textbook textile texture than thank that theater theatre thee their
    them theme themselves then theology theorem theory therapy there thereafter thereby therefore thereof
    thermal thesaurus these thesis theta they thick thin thing think third thirty this thorough those thou
    though thought thousand thread threat threatened three threshold thriller throat through throughout throw
    thrown thumb thunder thus ticket tide tied tier ties tiger tight tile till timber time tiny tips tire tissue
    titanium title today toddler together toilet token told tolerance toll tomato tomorrow tone tongue tonight
    tons took tool toolbox tooth topic tops total touch tough tour tourism tourist tournament toward tower town
    toys trace track tractor trade trademark tradition traffic trail train trance transcript transfer transform
    transit transition translate translator transmit transport trap trash travel traveller tray treasure
    treasury treat treatment treaty tree trek tremendous trend trial triangle tribal tribe tribunal tribune
    tribute trick tried tries trigger trim trio trip triple triumph troops tropical trouble trout truck true
    truly trunk trust trustee truth trying tsunami tube tuition tune tunnel turbo turkey turn turtle twelve
    twenty twice twin twist type typical ultimate ultra unable uncle under underlying understand understood
    undertake undertaken undo unexpected unified uniform union unique unit unity universal universe university
    unknown unless unlike unlimited unlock unsigned until unto unusual unwrap upcoming update upgrade upload
    upon upper upset urban urge urgent used useful user uses using usual utility utilize vacancies vacation
    vaccine vacuum valentine valid validity valley valuable value valve vanilla variable variance variations
    variety various vary vast vault vector vegetable vegetarian vehicle velocity velvet vendor venture venue
    verbal verify verse version versus vertical very vessel veteran veterinary vice victor victory video view
    villa village vintage vinyl violin viral virtual virtue visa visibility visible vision visit visitor vista
    visual vital vitamin vocabulary vocal vocational voice void volleyball volt voltage volume voluntary
    volunteer vote voters vulnerable wage wagon wait waiver wake walk wall wallet wallpaper walnut want ward
    warehouse warm warned warning warrior wash waste watch water waterproof watt wave ways weak wealth wear
    weather wedding week weekend weight weird welcome welding welfare well wellness went were west western whale
    what whatever wheat wheel when whenever where whereas wherever whether which while whilst white whole
    wholesale whom whose wide width wife wild wilderness wildlife will willow wind window wing winner winning
    wins winter wire wireless wisdom wise wish witch with withdrawal within without witness wizard wolf woman
    women wonder wonderful wood wooden wool word work workout workshop world worldwide worm worn worry worse
    worship worst worth worthy would wrap wrestling wrist write written wrong wrote yacht yard yarn yeah year
    yeast yellow yesterday yield yoga young your yourself youth zero zone zoom
  `.trim().split(/\s+/);

  // A deck deals the words of one game. next() -> { word, seen } (seen = shown earlier this game).
  function createDeck(words = WORDS, rnd = Math.random) {
    const pool = words.slice(); // never shown yet
    const shown = [];
    let current = null;
    const takeNew = () => {
      const i = Math.floor(rnd() * pool.length), w = pool[i];
      pool[i] = pool[pool.length - 1];
      pool.pop();
      return w;
    };
    return {
      next() {
        for (;;) {
          const pickSeen = shown.length > 0 && (pool.length === 0 || rnd() >= 0.5);
          if (!pickSeen) {
            const word = takeNew();
            shown.push(word);
            current = word;
            return { word, seen: false };
          }
          const word = shown[Math.floor(rnd() * shown.length)];
          if (word !== current) { current = word; return { word, seen: true }; }
          // same as the word on screen: flip again, like HB
        }
      },
      shownCount: () => shown.length,
    };
  }

  (window.__games = window.__games || []).push({
    id: 'verbal-memory', category: 'Memory', name: 'Verbal Memory', skill: 'Verbal memory', desc: 'have you seen this word before?', icon: '📖',
    gen: { WORDS, createDeck },
    start(el, api) {
      const LIVES = 3, LOCK_MS = 900;
      el.innerHTML =
        '<div class="hud vb-hud"><span class="vb-lives">Lives 3</span><span class="score vb-score">Score 0</span></div>' +
        '<div class="vb-card"><span class="vb-word">&nbsp;</span></div>' +
        '<div class="status vb-status">&nbsp;</div>' +
        '<div class="answers vb-answers"><button class="ans vb-seen" data-a="seen">SEEN</button><button class="ans vb-new" data-a="new">NEW</button></div>' +
        '<div class="panel vb-panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const livesEl = el.querySelector('.vb-lives');
      const scoreEl = el.querySelector('.vb-score');
      const card = el.querySelector('.vb-card');
      const wordEl = el.querySelector('.vb-word');
      const statusEl = el.querySelector('.vb-status');
      const seenBtn = el.querySelector('.vb-seen');
      const newBtn = el.querySelector('.vb-new');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let deck = null, turn = null, lives = LIVES, score = 0, running = false, locked = false;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const setStatus = (text, cls) => { statusEl.textContent = text || ' '; statusEl.className = 'status vb-status' + (cls ? ' ' + cls : ''); };

      function hud() {
        livesEl.textContent = 'Lives ' + lives;
        scoreEl.textContent = 'Score ' + score;
      }

      function nextWord() {
        turn = deck.next();
        wordEl.textContent = turn.word;
        card.className = 'vb-card';
        void card.offsetWidth; // restart the pop-in animation
        card.className = 'vb-card vb-pop';
        seenBtn.className = 'ans vb-seen';
        newBtn.className = 'ans vb-new';
        setStatus('');
      }

      function answer(saidSeen, b) {
        if (!running || locked) return;
        if (saidSeen === turn.seen) {
          score++;
          hud();
          nextWord();
          return;
        }
        lives--;
        hud();
        locked = true;
        b.classList.add('wrong');
        (turn.seen ? seenBtn : newBtn).classList.add('right');
        card.className = 'vb-card vb-wrong';
        setStatus(turn.seen ? 'You had seen it before' : 'It was a new word', 'vb-bad');
        later(() => {
          locked = false;
          if (lives <= 0) end(); else nextWord();
        }, LOCK_MS);
      }

      function end() {
        running = false;
        // quiet background behind the end panel
        wordEl.textContent = '\u00a0';
        card.className = 'vb-card';
        seenBtn.className = 'ans vb-seen';
        newBtn.className = 'ans vb-new';
        setStatus('');
        const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
        panel.querySelector('h3').textContent = 'Game over';
        panel.querySelector('.result').textContent = 'Score: ' + score + ' correct';
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        btn.textContent = 'Play again';
        panel.classList.remove('hidden');
      }

      function begin() {
        timers.forEach(clearTimeout); timers.length = 0;
        panel.classList.add('hidden');
        deck = createDeck();
        lives = LIVES; score = 0; locked = false; running = true;
        hud();
        nextWord();
      }

      seenBtn.addEventListener('click', () => answer(true, seenBtn));
      newBtn.addEventListener('click', () => answer(false, newBtn));
      btn.addEventListener('click', begin);
      hud();
      panel.querySelector('h3').textContent = 'Verbal Memory';
      panel.querySelector('.result').textContent =
        'Words appear one at a time. Tap SEEN if you saw it earlier in this game, NEW if not. You have 3 lives.';
      btn.textContent = 'Start';

      return () => { timers.forEach(clearTimeout); };
    },
  });
})();
