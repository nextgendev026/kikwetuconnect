import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

interface Q {
  question: string; options: string[]; correct_index: number; explanation: string
}

const QUESTION_BANK: Record<string, Q[]> = {
  counties: [
    { question: 'Which county is known as the "Green City in the Sun"?', options: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'], correct_index: 0, explanation: 'Nairobi is known as the Green City in the Sun.' },
    { question: 'Which county hosts the Maasai Mara National Reserve?', options: ['Narok', 'Kajiado', 'Nakuru', 'Laikipia'], correct_index: 0, explanation: 'The Maasai Mara is located in Narok County.' },
    { question: 'Turkana County is famous for which natural resource?', options: ['Oil', 'Gold', 'Diamonds', 'Coal'], correct_index: 0, explanation: 'Turkana has significant oil deposits.' },
    { question: 'Which county has the largest population?', options: ['Nairobi', 'Kiambu', 'Nakuru', 'Mombasa'], correct_index: 0, explanation: 'Nairobi is the most populous county.' },
    { question: 'Mombasa County is famous for which historical site?', options: ['Fort Jesus', 'Gede Ruins', 'Thimlich Ohinga', 'Koobi Fora'], correct_index: 0, explanation: 'Fort Jesus is a UNESCO site in Mombasa.' },
    { question: 'How many counties does Kenya have?', options: ['47', '45', '50', '42'], correct_index: 0, explanation: 'Kenya has 47 counties under the 2010 Constitution.' },
    { question: 'Which is the largest county by area?', options: ['Turkana', 'Marsabit', 'Nairobi', 'Kitui'], correct_index: 0, explanation: 'Turkana is the largest at ~71,000 sq km.' },
    { question: 'Which is the smallest county by area?', options: ['Vihiga', 'Mombasa', 'Nairobi', 'Siaya'], correct_index: 0, explanation: 'Vihiga is the smallest at ~531 sq km.' },
    { question: 'What is the capital of Kisumu County?', options: ['Kisumu', 'Siaya', 'Homa Bay', 'Migori'], correct_index: 0, explanation: 'Kisumu City is the capital of Kisumu County.' },
    { question: 'What is the capital of Uasin Gishu County?', options: ['Eldoret', 'Iten', 'Kapsabet', 'Kitale'], correct_index: 0, explanation: 'Eldoret is the capital of Uasin Gishu.' },
    { question: 'What is the capital of Kilifi County?', options: ['Kilifi', 'Malindi', 'Mombasa', 'Watamu'], correct_index: 0, explanation: 'Kilifi town is the county capital.' },
    { question: 'Which county contains Mount Kenya?', options: ['Meru', 'Nyeri', 'Kirinyaga', 'All of the above'], correct_index: 3, explanation: 'Mt Kenya spans multiple counties.' },
    { question: 'Which counties border Lake Victoria?', options: ['Kisumu, Siaya, Homa Bay', 'Nairobi, Kiambu', 'Mombasa, Kwale', 'Nakuru, Baringo'], correct_index: 0, explanation: 'Several counties border Lake Victoria.' },
    { question: 'Which county is known for white sand beaches?', options: ['Mombasa', 'Kilifi', 'Kwale', 'All of the above'], correct_index: 3, explanation: 'Kenya\'s coast has beautiful beaches across multiple counties.' },
    { question: 'What is the capital of Laikipia County?', options: ['Rumuruti', 'Nanyuki', 'Nyahururu', 'Naro Moru'], correct_index: 0, explanation: 'Rumuruti serves as Laikipia\'s capital.' },
  ],
  agriculture: [
    { question: 'Which region is known as Kenya\'s breadbasket?', options: ['Rift Valley', 'Coast', 'Eastern', 'Nyanza'], correct_index: 0, explanation: 'The Rift Valley is Kenya\'s primary agricultural zone.' },
    { question: 'What is the main cash crop in central Kenya?', options: ['Coffee', 'Tea', 'Sugarcane', 'Cotton'], correct_index: 0, explanation: 'Coffee is a major cash crop in central Kenya.' },
    { question: 'Which farming method is most sustainable for small-scale farmers?', options: ['Crop rotation', 'Monocropping', 'Slash and burn', 'Overgrazing'], correct_index: 0, explanation: 'Crop rotation maintains soil fertility.' },
    { question: 'What is the "shamba system"?', options: ['Growing crops under trees', 'Irrigation farming', 'Greenhouse farming', 'Hydroponics'], correct_index: 0, explanation: 'Shamba system inter-crops during tree establishment.' },
    { question: 'Which county leads in tea production?', options: ['Kericho', 'Nandi', 'Kiambu', 'Muranga'], correct_index: 0, explanation: 'Kericho is Kenya\'s leading tea producer.' },
    { question: 'What is the best maize planting season in Kenya?', options: ['March-May', 'June-August', 'September-November', 'December-February'], correct_index: 0, explanation: 'Long rains (March-May) is the main maize season.' },
    { question: 'What does drip irrigation conserve most?', options: ['Water', 'Soil', 'Fertilizer', 'Seeds'], correct_index: 0, explanation: 'Drip irrigation delivers water directly to roots.' },
    { question: 'Which pest attacks Kenyan maize farms?', options: ['Fall armyworm', 'Locusts', 'Aphids', 'Whiteflies'], correct_index: 0, explanation: 'Fall armyworm is a major maize pest.' },
    { question: 'What is the ideal soil pH for most Kenyan crops?', options: ['5.5-7.0', '3.0-4.5', '8.0-9.5', '2.0-3.5'], correct_index: 0, explanation: 'Most crops thrive at pH 5.5-7.0.' },
    { question: 'Which fertilizer is richest in nitrogen?', options: ['Urea', 'CAN', 'DAP', 'NPK 23:23:0'], correct_index: 0, explanation: 'Urea contains 46% nitrogen.' },
    { question: 'What is grafting used for?', options: ['Combining two plants', 'Pruning branches', 'Adding fertilizer', 'Controlling pests'], correct_index: 0, explanation: 'Grafting joins two plants for desirable traits.' },
    { question: 'What is the most common dairy cattle breed in Kenya?', options: ['Friesian', 'Sahiwal', 'Boran', 'Zebu'], correct_index: 0, explanation: 'Friesians are the most common dairy breed.' },
    { question: 'What disease affects Kenyan poultry most?', options: ['Newcastle disease', 'Foot and mouth', 'East Coast fever', 'Trypanosomiasis'], correct_index: 0, explanation: 'Newcastle disease is a major poultry threat.' },
    { question: 'What is zero grazing?', options: ['Confined feeding system', 'Free-range', 'Rotational grazing', 'Pasture farming'], correct_index: 0, explanation: 'Zero grazing confines animals and brings feed to them.' },
    { question: 'What is a cow\'s gestation period?', options: ['9 months', '5 months', '12 months', '7 months'], correct_index: 0, explanation: 'A cow gestates for about 9 months.' },
  ],
  culture: [
    { question: 'What is the traditional Kenyan cloth?', options: ['Kitenge', 'Kente', 'Dashiki', 'Kikoy'], correct_index: 0, explanation: 'Kitenge is a vibrant East African fabric.' },
    { question: 'What is Nyama Choma?', options: ['Roasted meat', 'Fried fish', 'Vegetable stew', 'Ugali'], correct_index: 0, explanation: 'Nyama Choma is beloved Kenyan roasted meat.' },
    { question: 'Which community performs the Adumu jumping dance?', options: ['Maasai', 'Kikuyu', 'Luo', 'Kamba'], correct_index: 0, explanation: 'The Maasai are known for adumu.' },
    { question: 'What is Ugali made from?', options: ['Maize flour', 'Wheat flour', 'Rice flour', 'Cassava flour'], correct_index: 0, explanation: 'Ugali is made from maize flour.' },
    { question: 'Which community celebrates Tero Buru?', options: ['Luo', 'Kikuyu', 'Kalenjin', 'Mijikenda'], correct_index: 0, explanation: 'Tero buru is a Luo funeral ceremony.' },
    { question: 'Which music genre originated in Kenya?', options: ['Benga', 'Afrobeat', 'Highlife', 'Mbalax'], correct_index: 0, explanation: 'Benga originated from the Luo community.' },
    { question: 'Who is the "King of Benga"?', options: ['DO Misiani', 'Fadhili William', 'Joseph Kamaru', 'Johnny Junior'], correct_index: 0, explanation: 'DO Misiani is the king of Benga.' },
    { question: 'What is Kapuka in music?', options: ['A Kenyan rap subgenre', 'A traditional dance', 'An instrument', 'A festival'], correct_index: 0, explanation: 'Kapuka is a Kenyan hip-hop subgenre.' },
    { question: 'Which Kenyan artist won a BET Award?', options: ['Sauti Sol', 'Nameless', 'Wahu', 'Akothee'], correct_index: 0, explanation: 'Sauti Sol won the BET International Act award.' },
    { question: 'What is a traditional instrument made from cow horn?', options: ['Kudu horn', 'Nyatiti', 'Orutu', 'Endo'], correct_index: 0, explanation: 'The kudu horn is a traditional wind instrument.' },
  ],
  rights: [
    { question: 'What is Kenya\'s highest court?', options: ['Supreme Court', 'Court of Appeal', 'High Court', 'Chief Magistrate'], correct_index: 0, explanation: 'The Supreme Court is Kenya\'s highest court.' },
    { question: 'When was the Kenyan Constitution promulgated?', options: ['2010', '2008', '2013', '2005'], correct_index: 0, explanation: 'The Constitution was promulgated August 27, 2010.' },
    { question: 'How many chapters does the Constitution have?', options: ['18', '15', '20', '12'], correct_index: 0, explanation: 'The Constitution has 18 chapters.' },
    { question: 'What does Article 27 guarantee?', options: ['Equality and non-discrimination', 'Free speech', 'Education', 'Healthcare'], correct_index: 0, explanation: 'Article 27 guarantees equality.' },
    { question: 'What is the Bill of Rights?', options: ['Chapter Four', 'A separate law', 'A decree', 'An act'], correct_index: 0, explanation: 'The Bill of Rights is Chapter Four.' },
    { question: 'What does the DPP do?', options: ['Prosecutes criminal cases', 'Defends accused', 'Presides over trials', 'Makes laws'], correct_index: 0, explanation: 'The DPP prosecutes criminal cases.' },
    { question: 'How many Supreme Court judges?', options: ['7', '5', '9', '11'], correct_index: 0, explanation: 'The Supreme Court has 7 judges.' },
    { question: 'What is habeas corpus?', options: ['Challenge unlawful detention', 'A court order', 'A charge', 'A legal fee'], correct_index: 0, explanation: 'Habeas corpus allows challenging detention.' },
    { question: 'Who appoints the Chief Justice?', options: ['The President', 'JSC', 'Parliament', 'Attorney General'], correct_index: 0, explanation: 'The President appoints the CJ.' },
    { question: 'What court handles children\'s cases?', options: ['Children\'s Court', 'Juvenile Court', 'Family Court', 'Magistrate'], correct_index: 0, explanation: 'The Children\'s Court handles minors.' },
  ],
  biashara: [
    { question: 'What does SACCO stand for?', options: ['Savings and Credit Cooperative', 'Small African Commerce Org', 'Strategic Committee', 'Savings Association'], correct_index: 0, explanation: 'SACCOs are member-owned cooperatives.' },
    { question: 'Which body regulates SACCOs?', options: ['SASRA', 'CBK', 'IRA', 'KRA'], correct_index: 0, explanation: 'SASRA regulates SACCOs.' },
    { question: 'What is a Single Business Permit?', options: ['A business operating license', 'A tax certificate', 'A loan application', 'An agreement'], correct_index: 0, explanation: 'Single Business Permits are issued by counties.' },
    { question: 'What is the standard VAT rate in Kenya?', options: ['16%', '14%', '18%', '20%'], correct_index: 0, explanation: 'VAT in Kenya is 16%.' },
    { question: 'What is FOSA in SACCOs?', options: ['Front Office Services Activity', 'Financial Operations', 'Fund Origination', 'Full Online Access'], correct_index: 0, explanation: 'FOSA is front office banking of SACCOs.' },
    { question: 'What is BOSA in SACCOs?', options: ['Back Office Services Activity', 'Basic Operations', 'Branch Supervision', 'Banking Office'], correct_index: 0, explanation: 'BOSA is back office operations of SACCOs.' },
    { question: 'What is Fuliza?', options: ['An M-Pesa overdraft', 'A savings account', 'Insurance', 'Payment service'], correct_index: 0, explanation: 'Fuliza is M-Pesa\'s overdraft facility.' },
    { question: 'What is PesaLink?', options: ['Interbank real-time payments', 'A loan app', 'Cryptocurrency', 'A savings product'], correct_index: 0, explanation: 'PesaLink enables real-time bank transfers.' },
    { question: 'Which bank pioneered agency banking?', options: ['Equity Bank', 'KCB', 'Cooperative Bank', 'Barclays'], correct_index: 0, explanation: 'Equity pioneered agency banking.' },
    { question: 'What is the minimum SACCO membership?', options: ['10', '5', '25', '30'], correct_index: 0, explanation: 'At least 10 members are needed.' },
  ],
  tech: [
    { question: 'Kenya\'s Silicon Savannah is centered around which city?', options: ['Nairobi', 'Mombasa', 'Eldoret', 'Kisumu'], correct_index: 0, explanation: 'Nairobi is Kenya\'s tech hub.' },
    { question: 'Which fintech pioneered mobile money?', options: ['M-Pesa', 'Airtel Money', 'Equitel', 'T-Kash'], correct_index: 0, explanation: 'M-Pesa revolutionized mobile money.' },
    { question: 'What is Konza Technopolis?', options: ['A smart city project', 'A tech incubator', 'A university', 'A lab'], correct_index: 0, explanation: 'Konza is Kenya\'s smart city project.' },
    { question: 'What does IoT stand for?', options: ['Internet of Things', 'Integration of Tech', 'Input Output Terminal', 'Internal Tool'], correct_index: 0, explanation: 'IoT is interconnected devices.' },
    { question: 'What does ICT stand for?', options: ['Information and Communications Tech', 'International Computing', 'Integrated Terminal', 'Internet Tools'], correct_index: 0, explanation: 'ICT is the standard tech term.' },
    { question: 'What does URL stand for?', options: ['Uniform Resource Locator', 'Universal Resource Link', 'Unified Remote Login', 'Reference Library'], correct_index: 0, explanation: 'URL is a web page address.' },
    { question: 'What is phishing?', options: ['A data theft attempt', 'A computer virus', 'A firewall setting', 'Encryption'], correct_index: 0, explanation: 'Phishing tricks users into revealing data.' },
    { question: 'What is cloud computing?', options: ['Storing data over the internet', 'Weather computing', 'Using physical servers', 'Offline processing'], correct_index: 0, explanation: 'Cloud computing delivers services over the internet.' },
    { question: 'What is two-factor authentication?', options: ['An extra security layer', 'Two devices', 'Dual SIM', 'File compression'], correct_index: 0, explanation: '2FA adds a second verification step.' },
    { question: 'What is a spreadsheet used for?', options: ['Organizing data in rows/columns', 'Writing documents', 'Designing graphics', 'Sending emails'], correct_index: 0, explanation: 'Spreadsheets organize data.' },
  ],
  health: [
    { question: 'What causes malaria?', options: ['Mosquito bites', 'Contaminated water', 'Airborne viruses', 'Food poisoning'], correct_index: 0, explanation: 'Malaria is transmitted by mosquitoes.' },
    { question: 'Kenya\'s universal healthcare program?', options: ['UHC', 'Afya House', 'Linda Mama', 'NHIF'], correct_index: 0, explanation: 'UHC is Kenya\'s health program.' },
    { question: 'What vaccine protects against TB?', options: ['BCG', 'Polio', 'Measles', 'Tetanus'], correct_index: 0, explanation: 'BCG protects against tuberculosis.' },
    { question: 'What is a key dehydration symptom?', options: ['Thirst and dark urine', 'Headache', 'Fever', 'Cough'], correct_index: 0, explanation: 'Thirst and dark urine signal dehydration.' },
    { question: 'What causes cholera outbreaks?', options: ['Contaminated water', 'Mosquitoes', 'Air pollution', 'Contact'], correct_index: 0, explanation: 'Cholera spreads through contaminated water.' },
    { question: 'How is TB transmitted?', options: ['Through cough droplets', 'Blood transfusion', 'Contaminated food', 'Insect bites'], correct_index: 0, explanation: 'TB spreads through airborne droplets.' },
    { question: 'Recommended exclusive breastfeeding duration?', options: ['6 months', '3 months', '12 months', '9 months'], correct_index: 0, explanation: 'WHO recommends 6 months exclusive breastfeeding.' },
    { question: 'What is a Community Health Volunteer?', options: ['Community-based health worker', 'Hospital worker', 'Pharmacist', 'Surgeon'], correct_index: 0, explanation: 'CHVs provide primary care at community level.' },
    { question: 'Which mosquito disease has a vaccine in Kenya?', options: ['Yellow fever', 'Malaria', 'Dengue', 'Zika'], correct_index: 0, explanation: 'Yellow fever vaccine is available.' },
    { question: 'What does HIV stand for?', options: ['Human Immunodeficiency Virus', 'Human Infection Virus', 'Hereditary Immune Virus', 'Health Vaccine'], correct_index: 0, explanation: 'HIV attacks the immune system.' },
  ],
  environment: [
    { question: 'Which is Kenya\'s highest mountain?', options: ['Mt Kenya', 'Mt Kilimanjaro', 'Mt Elgon', 'Aberdare'], correct_index: 0, explanation: 'Mt Kenya is 5,199m.' },
    { question: 'What threatens Lake Victoria?', options: ['All of the above', 'Water hyacinth', 'Overfishing', 'Pollution'], correct_index: 0, explanation: 'Lake Victoria faces multiple threats.' },
    { question: 'How many trees does Kenya aim to plant by 2032?', options: ['15 billion', '1 billion', '500 million', '10 billion'], correct_index: 0, explanation: 'Kenya targets 15 billion trees.' },
    { question: 'What is the largest national park in Kenya?', options: ['Tsavo', 'Maasai Mara', 'Amboseli', 'Nairobi'], correct_index: 0, explanation: 'Tsavo is Kenya\'s largest park.' },
    { question: 'What is catchment area conservation?', options: ['Protecting water sources', 'Fishing limits', 'Forest logging', 'Mining rules'], correct_index: 0, explanation: 'Conservation protects water towers like Mau Forest.' },
    { question: 'What is the main agricultural greenhouse gas?', options: ['Methane', 'Carbon dioxide', 'Nitrous oxide', 'Ozone'], correct_index: 0, explanation: 'Livestock produces methane.' },
    { question: 'Which sustainable energy source does Kenya lead in?', options: ['Geothermal', 'Coal', 'Diesel', 'Nuclear'], correct_index: 0, explanation: 'Kenya is a geothermal leader in Africa.' },
    { question: 'What causes most deforestation in Kenya?', options: ['Charcoal burning', 'Logging', 'Agriculture', 'Urbanization'], correct_index: 0, explanation: 'Charcoal production drives deforestation.' },
    { question: 'What is carbon sequestration?', options: ['Capturing CO2', 'Burning fossil fuels', 'Releasing gases', 'Measuring air'], correct_index: 0, explanation: 'Carbon sequestration captures CO2.' },
    { question: 'Which county has the largest wind farm?', options: ['Turkana', 'Narok', 'Kajiado', 'Meru'], correct_index: 0, explanation: 'Lake Turkana Wind Power is Africa\'s largest.' },
    { question: 'What is Kenya\'s national animal?', options: ['Lion', 'Elephant', 'Giraffe', 'Rhino'], correct_index: 0, explanation: 'The lion is Kenya\'s national animal.' },
    { question: 'What are the Big Five?', options: ['Lion, elephant, rhino, buffalo, leopard', 'Giraffe, zebra, wildebeest, hyena, cheetah', 'Hippo, croc, flamingo, ostrich, monkey', 'All animals'], correct_index: 0, explanation: 'The Big Five are key safari animals.' },
    { question: 'Where is the Great Wildebeest Migration?', options: ['Maasai Mara', 'Tsavo', 'Amboseli', 'Samburu'], correct_index: 0, explanation: 'The migration crosses the Mara annually.' },
    { question: 'Which conservancy is known for rhinos?', options: ['Ol Pejeta', 'Nairobi Park', 'Lake Nakuru', 'Amboseli'], correct_index: 0, explanation: 'Ol Pejeta is a black rhino sanctuary.' },
    { question: 'What is climate-smart agriculture?', options: ['Farming adapting to climate', 'More fertilizers', 'Industrial farming', 'Monocropping'], correct_index: 0, explanation: 'Climate-smart ag increases climate resilience.' },
  ],
}

const ALL_QUESTIONS = Object.values(QUESTION_BANK).flat()

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { category, difficulty, count = 5 } = await request.json()

    let questions: Q[] = []

    // Try AI API first if key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `Generate ${count} multiple choice questions about ${category || 'Kenya'} (${difficulty || 'easy'} difficulty). Return JSON array with: question, options (array of 4), correct_index (0-3), explanation (1 sentence).`
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.8 }),
          signal: AbortSignal.timeout(15000),
        })
        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const parsed = JSON.parse(aiData.choices?.[0]?.message?.content || '{}')
          if (parsed.questions?.length) questions = parsed.questions
          else if (Array.isArray(parsed)) questions = parsed
        }
      } catch { /* fall through to local bank */ }
    }

    // Fall back to local question bank
    if (questions.length === 0) {
      const catId = category?.toLowerCase() || ''
      let pool = [...(QUESTION_BANK[catId] || []), ...(ALL_QUESTIONS)]
      const shuffled = pool.sort(() => Math.random() - 0.5)
      questions = shuffled.slice(0, Math.min(count, shuffled.length))
    }

    return NextResponse.json({ questions, count: questions.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
})
