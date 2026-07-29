import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

const QUESTION_BANK: Record<string, Array<{ question: string; options: string[]; correct_index: number; explanation: string }>> = {
  counties: [
    { question: 'Which county is known as the "Green City in the Sun"?', options: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'], correct_index: 0, explanation: 'Nairobi is known as the Green City in the Sun due to its many green spaces and equatorial sunshine.' },
    { question: 'Which county hosts the Maasai Mara National Reserve?', options: ['Narok', 'Kajiado', 'Nakuru', 'Laikipia'], correct_index: 0, explanation: 'The Maasai Mara is located in Narok County, southwestern Kenya.' },
    { question: 'Turkana County is famous for which natural resource?', options: ['Oil', 'Gold', 'Diamonds', 'Coal'], correct_index: 0, explanation: 'Turkana County has significant oil deposits discovered in the South Lokichar Basin.' },
    { question: 'Which county has the largest population in Kenya?', options: ['Nairobi', 'Kiambu', 'Nakuru', 'Mombasa'], correct_index: 0, explanation: 'Nairobi is the most populous county in Kenya.' },
    { question: 'Mombasa County is famous for which historical site?', options: ['Fort Jesus', 'Gede Ruins', 'Thimlich Ohinga', 'Koobi Fora'], correct_index: 0, explanation: 'Fort Jesus is a UNESCO World Heritage site in Mombasa.' },
  ],
  agriculture: [
    { question: 'Which region is known as Kenya\'s "breadbasket"?', options: ['Rift Valley', 'Coast', 'Eastern', 'Nyanza'], correct_index: 0, explanation: 'The Rift Valley region is Kenya\'s primary agricultural zone.' },
    { question: 'What is the main cash crop grown in central Kenya?', options: ['Tea', 'Coffee', 'Sugarcane', 'Cotton'], correct_index: 1, explanation: 'Coffee is a major cash crop in central Kenya, especially in counties like Kiambu and Muranga.' },
    { question: 'Which farming method is most sustainable for small-scale farmers?', options: ['Crop rotation', 'Monocropping', 'Slash and burn', 'Overgrazing'], correct_index: 0, explanation: 'Crop rotation helps maintain soil fertility and reduces pest buildup.' },
  ],
  culture: [
    { question: 'What is the traditional Kenyan cloth known as?', options: ['Kitenge', 'Kente', 'Dashiki', 'Kikoy'], correct_index: 0, explanation: 'Kitenge is a vibrant East African fabric worn for cultural events.' },
    { question: 'Which community celebrates the "Luo festival of the dead"?', options: ['Luo', 'Kikuyu', 'Maasai', 'Kamba'], correct_index: 0, explanation: 'The Luo community holds funeral rites called "tero buru" to honor the departed.' },
    { question: 'What is "Nyama Choma" in Kenyan culture?', options: ['Roasted meat', 'Fried fish', 'Vegetable stew', 'Ugali'], correct_index: 0, explanation: 'Nyama Choma (roasted meat) is a beloved Kenyan social dish.' },
  ],
  tech: [
    { question: 'Kenya\'s "Silicon Savannah" is centered around which city?', options: ['Nairobi', 'Mombasa', 'Eldoret', 'Kisumu'], correct_index: 0, explanation: 'Nairobi is the hub of Kenya\'s tech ecosystem, known as Silicon Savannah.' },
    { question: 'Which Kenyan fintech pioneered mobile money?', options: ['M-Pesa', 'Airtel Money', 'Equitel', 'T-Kash'], correct_index: 0, explanation: 'M-Pesa by Safaricom revolutionized mobile money in Kenya since 2007.' },
    { question: 'What does "IoT" stand for?', options: ['Internet of Things', 'Integration of Tech', 'Input Output Terminal', 'Internal Operating Tool'], correct_index: 0, explanation: 'IoT refers to interconnected devices that communicate over the internet.' },
  ],
  health: [
    { question: 'What is the leading cause of malaria in Kenya?', options: ['Mosquito bites', 'Contaminated water', 'Airborne viruses', 'Food poisoning'], correct_index: 0, explanation: 'Malaria is transmitted through the bite of infected female Anopheles mosquitoes.' },
    { question: 'Kenya\'s universal healthcare program is called?', options: ['Afya House', 'Linda Mama', 'NHIF', 'UHC'], correct_index: 3, explanation: 'Universal Health Coverage (UHC) is Kenya\'s flagship health program.' },
  ],
  environment: [
    { question: 'Which is Kenya\'s highest mountain?', options: ['Mt Kenya', 'Mt Kilimanjaro', 'Mt Elgon', 'Aberdare Range'], correct_index: 0, explanation: 'Mount Kenya is the highest mountain in Kenya at 5,199 meters.' },
    { question: 'What is the main threat to Lake Victoria\'s ecosystem?', options: ['Water hyacinth', 'Overfishing', 'Pollution', 'All of the above'], correct_index: 3, explanation: 'Lake Victoria faces multiple threats including water hyacinth, overfishing, and pollution.' },
    { question: 'Kenya aims to plant how many trees by 2032?', options: ['1 billion', '500 million', '15 billion', '10 billion'], correct_index: 2, explanation: 'Kenya targets to plant 15 billion trees by 2032 to combat deforestation.' },
  ],
  biashara: [
    { question: 'What does "SACCO" stand for?', options: ['Savings and Credit Cooperative', 'Small African Commerce Organization', 'Strategic Advisory Committee', 'Savings Association'], correct_index: 0, explanation: 'SACCOs are member-owned financial cooperatives popular in Kenya.' },
    { question: 'Which mobile lending app is most popular in Kenya?', options: ['Tala', 'M-Shwari', 'Fuliza', 'Branch'], correct_index: 1, explanation: 'M-Shwari is a mobile savings and loan service offered through M-Pesa.' },
  ],
  rights: [
    { question: 'What is Kenya\'s highest court?', options: ['Supreme Court', 'Court of Appeal', 'High Court', 'Chief Magistrate Court'], correct_index: 0, explanation: 'The Supreme Court is the highest judicial authority in Kenya.' },
    { question: 'The Kenyan Constitution was promulgated in which year?', options: ['2010', '2008', '2013', '2005'], correct_index: 0, explanation: 'The Constitution of Kenya was promulgated on August 27, 2010.' },
  ],
}

const DIFFICULTY_QUESTIONS: Record<string, Array<{ question: string; options: string[]; correct_index: number; explanation: string }>> = {
  easy: [
    { question: 'What is the capital city of Kenya?', options: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'], correct_index: 0, explanation: 'Nairobi is the capital and largest city of Kenya.' },
    { question: 'Which ocean borders Kenya to the east?', options: ['Indian Ocean', 'Atlantic Ocean', 'Pacific Ocean', 'Mediterranean Sea'], correct_index: 0, explanation: 'Kenya\'s eastern coastline borders the Indian Ocean.' },
    { question: 'What is the most widely spoken local language in Kenya?', options: ['Swahili', 'Kikuyu', 'Luo', 'Kamba'], correct_index: 0, explanation: 'Swahili is the most widely spoken language and a national language of Kenya.' },
  ],
  medium: [
    { question: 'What is Kenya\'s main export?', options: ['Tea', 'Coffee', 'Flowers', 'All of the above'], correct_index: 3, explanation: 'Kenya is a leading exporter of tea, coffee, and cut flowers.' },
    { question: 'Which year did Kenya gain independence?', options: ['1963', '1960', '1965', '1957'], correct_index: 0, explanation: 'Kenya gained independence from Britain on December 12, 1963.' },
  ],
  hard: [
    { question: 'What is the total number of counties in Kenya?', options: ['47', '45', '50', '42'], correct_index: 0, explanation: 'Kenya has 47 counties established under the 2010 Constitution.' },
    { question: 'Which Kenyan athlete holds the marathon world record?', options: ['Eliud Kipchoge', 'Kipchoge Keino', 'David Rudisha', 'Wilson Kipsang'], correct_index: 0, explanation: 'Eliud Kipchoge set the official marathon world record at the 2022 Berlin Marathon.' },
  ],
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { category, difficulty, count = 5 } = await request.json()

    const questions: Array<{ question: string; options: string[]; correct_index: number; explanation: string }> = []
    const catId = category?.toLowerCase() || ''

    let pool = [...(QUESTION_BANK[catId] || []), ...(QUESTION_BANK.counties || [])]
    const diffPool = DIFFICULTY_QUESTIONS[difficulty] || DIFFICULTY_QUESTIONS.easy
    pool = [...pool, ...diffPool]

    if (pool.length === 0) {
      pool = Object.values(QUESTION_BANK).flat()
      pool = [...pool, ...DIFFICULTY_QUESTIONS.easy]
    }

    const shuffled = pool.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, shuffled.length))

    return NextResponse.json({ questions: selected, count: selected.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
