-- Seed additional quizzes: two more per category to expand the library.

-- ====== COUNTIES ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Counties at Work', 'counties-at-work', 'How county governments deliver devolution in Kenya', 'counties', 'medium', 5, 6, 15, 'en'),
('Coast Counties', 'coast-counties', 'Explore Mombasa, Kwale, Kilifi, Taita-Taveta and Lamu', 'counties', 'easy', 5, 5, 10, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Counties at Work' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which body allocates funds to county governments?', ARRAY['National Treasury', 'Senate', 'CRA', 'IEBC'], 2, 'The Commission on Revenue Allocation recommends county allocations.'),
((SELECT id FROM quiz), 'How often are county governors elected?', ARRAY['Every 5 years', 'Every 4 years', 'Every 6 years', 'Every 7 years'], 0, 'County governors are elected every five years.'),
((SELECT id FROM quiz), 'Which level of government handles county health services?', ARRAY['County', 'National', 'Ward', 'Village'], 0, 'Devolved health services are managed at the county level.'),
((SELECT id FROM quiz), 'What is the county assembly''s main role?', ARRAY['Make county laws', 'Collect national taxes', 'Appoint judges', 'Manage foreign policy'], 0, 'County assemblies legislate and oversee the county executive.'),
((SELECT id FROM quiz), 'Which county established the first county university?', ARRAY['Embu', 'Meru', 'Kisii', 'Machakos'], 0, 'Embu County hosts one of the earliest county-sponsored universities.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Coast Counties' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which county is home to Diani Beach?', ARRAY['Kwale', 'Kilifi', 'Mombasa', 'Lamu'], 0, 'Diani Beach is in Kwale County.'),
((SELECT id FROM quiz), 'Which county contains Tsavo East National Park?', ARRAY['Taita-Taveta', 'Kajiado', 'Nakuru', 'Narok'], 0, 'Tsavo East lies mainly in Taita-Taveta County.'),
((SELECT id FROM quiz), 'Lamu County is famous for which historical town?', ARRAY['Lamu Old Town', 'Gede', 'Vasco da Gama', 'Mombasa'], 0, 'Lamu Old Town is a UNESCO World Heritage site.'),
((SELECT id FROM quiz), 'Which port city is the capital of Mombasa County?', ARRAY['Mombasa', 'Likoni', 'Mtwapa', 'Shanzu'], 0, 'Mombasa City is the county headquarters.'),
((SELECT id FROM quiz), 'What is a major economic activity in Kilifi County?', ARRAY['Cashew farming', 'Gold mining', 'Tea growing', 'Wheat farming'], 0, 'Kilifi is known for cashew nut farming.');

-- ====== AGRICULTURE ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Agribusiness', 'agribusiness', 'Turning Kenyan farms into profitable enterprises', 'agriculture', 'medium', 5, 6, 15, 'en'),
('Beekeeping', 'beekeeping', 'Modern apiculture practices for Kenyan farmers', 'agriculture', 'hard', 5, 7, 20, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Agribusiness' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What does "value addition" mean in agribusiness?', ARRAY['Processing raw produce to raise value', 'Buying at lowest price', 'Selling in bulk', 'Reducing crop variety'], 0, 'Value addition processes raw products into higher-value goods.'),
((SELECT id FROM quiz), 'Which body certifies organic produce in Kenya?', ARRAY['KEBS', 'KEPHIS', 'KRA', 'NEMA'], 1, 'KEPHIS certifies plant health and organic standards.'),
((SELECT id FROM quiz), 'What is a farmer''s cooperative mainly for?', ARRAY['Pooling resources to market produce', 'Registering land', 'Borrowing from CBK', 'Paying income tax'], 0, 'Cooperatives let farmers pool resources for better prices.'),
((SELECT id FROM quiz), 'Which crop earns Kenya the most export revenue?', ARRAY['Tea', 'Maize', 'Wheat', 'Potatoes'], 0, 'Tea is Kenya''s top agricultural export earner.'),
((SELECT id FROM quiz), 'What is contract farming?', ARRAY['Growing crops under a buyer agreement', 'Farming on leased land', 'Growing organic only', 'Export-only farming'], 0, 'Contract farming involves an agreement with a buyer before planting.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Beekeeping' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the most common hive type in Kenya?', ARRAY['Kenya Top Bar Hive', 'Langstroth', 'Skep', 'Warre'], 0, 'The Kenya Top Bar Hive is widely used by smallholder farmers.'),
((SELECT id FROM quiz), 'What is the queen bee''s primary role?', ARRAY['Laying eggs', 'Collecting nectar', 'Guarding the hive', 'Making honey'], 0, 'The queen''s main job is to lay eggs.'),
((SELECT id FROM quiz), 'Which region is a leading honey producer in Kenya?', ARRAY['Kitui', 'Nairobi', 'Kericho', 'Nakuru'], 0, 'Kitui is known for high honey production.'),
((SELECT id FROM quiz), 'What is "supersedure" in a colony?', ARRAY['Replacing an old queen', 'Splitting the hive', 'Moving the hive', 'Feeding sugar'], 0, 'Supersedure is when a colony rears a new queen to replace an old one.'),
((SELECT id FROM quiz), 'Which product besides honey do bees produce?', ARRAY['Beeswax', 'Pollen substitute', 'Royal jelly powder', 'Bee venom cream'], 0, 'Bees produce beeswax used in cosmetics and candles.');

-- ====== CULTURE ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Food & Festivals', 'food-and-festivals', 'Kenyan cuisine and cultural celebrations', 'culture', 'easy', 5, 5, 10, 'en'),
('Heritage Sites', 'heritage-sites', 'Kenya''s UNESCO sites and national heritage', 'culture', 'medium', 5, 6, 15, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Food & Festivals' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is "mukimo" made from?', ARRAY['Potatoes, maize and greens', 'Rice and beans', 'Cassava only', 'Plantains'], 0, 'Mukimo is a Kikuyu dish of mashed potatoes, maize and greens.'),
((SELECT id FROM quiz), 'Which festival celebrates Swahili culture on the coast?', ARRAY['Lamuyu Cultural Festival', 'Mombasa Carnival', 'Wildebeest Fest', 'Safari Rally'], 0, 'The Lamu Cultural Festival celebrates Swahili heritage.'),
((SELECT id FROM quiz), 'What is "uji"?', ARRAY['A porridge drink', 'A roasted banana', 'A type of stew', 'Fried dough'], 0, 'Uji is a popular Kenyan porridge.'),
((SELECT id FROM quiz), 'Which community holds the "Iko Toa" celebration?', ARRAY['Mijikenda', 'Maasai', 'Kikuyu', 'Samburu'], 0, 'The Mijikenda celebrate Iko Toa.'),
((SELECT id FROM quiz), 'What is "mutura"?', ARRAY['Kenyan sausage', 'Boiled greens', 'Coconut rice', 'Fried fish'], 0, 'Mutura is a traditional Kenyan sausage.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Heritage Sites' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which of these is a UNESCO World Heritage Site in Kenya?', ARRAY['Fort Jesus', 'Kenya National Archives', 'Nairobi Museum', 'Bomas of Kenya'], 0, 'Fort Jesus in Mombasa is a UNESCO site.'),
((SELECT id FROM quiz), 'The sacred Kaya forests belong to which community?', ARRAY['Mijikenda', 'Luo', 'Kamba', 'Embu'], 0, 'The Kaya forests are sacred to the Mijikenda.'),
((SELECT id FROM quiz), 'Lake Turkana National Parks are famous for what?', ARRAY['Fossil finds', 'Coffee farms', 'Tea estates', 'Ski resorts'], 0, 'Lake Turkana parks are renowned for hominid fossils.'),
((SELECT id FROM quiz), 'Which site preserves Kenya''s ancient Swahili ruins?', ARRAY['Gede Ruins', 'Koobi Fora', 'Olorgesailie', 'Hyrax Hill'], 0, 'Gede Ruins are ancient Swahili town ruins near Malindi.'),
((SELECT id FROM quiz), 'What is Olorgesailie known for?', ARRAY['Stone tool archaeology', 'Bird watching', 'Cave paintings', 'Gold mining'], 0, 'Olorgesailie is a famous prehistoric stone tool site.');

-- ====== RIGHTS ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Devolved Governance', 'devolved-governance', 'How devolution works under the 2010 Constitution', 'rights', 'medium', 5, 6, 15, 'en'),
('Citizen Duties', 'citizen-duties', 'Your civic responsibilities as a Kenyan citizen', 'rights', 'easy', 5, 5, 10, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Devolved Governance' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'How many levels of government does Kenya have?', ARRAY['Two', 'One', 'Three', 'Four'], 0, 'Kenya has national and county governments.'),
((SELECT id FROM quiz), 'Who heads the Senate?', ARRAY['The Speaker', 'The President', 'The CJ', 'The AG'], 0, 'The Senate is presided over by its Speaker.'),
((SELECT id FROM quiz), 'What does the Council of Governors do?', ARRAY['Coordinates county governments', 'Collects county taxes', 'Appoints governors', 'Hears appeals'], 0, 'The Council of Governors coordinates devolved governments.'),
((SELECT id FROM quiz), 'County revenue is primarily raised through what?', ARRAY['Local taxes and fees', 'Only national grants', 'Foreign loans', 'Stamp duty only'], 0, 'Counties raise revenue from local levies and national allocations.'),
((SELECT id FROM quiz), 'Which document is the basis of devolution?', ARRAY['Chapter 11 of the Constitution', 'The Penal Code', 'The Companies Act', 'The National Accord'], 0, 'Chapter 11 of the 2010 Constitution sets out devolution.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Citizen Duties' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is a key civic duty of every Kenyan?', ARRAY['Voting in elections', 'Driving carefully only', 'Paying school fees', 'Owning land'], 0, 'Voting is a core civic responsibility.'),
((SELECT id FROM quiz), 'Which of these is a constitutional right?', ARRAY['Freedom of expression', 'Free mobile data', 'Free petrol', 'Free housing'], 0, 'Freedom of expression is guaranteed in the Bill of Rights.'),
((SELECT id FROM quiz), 'What is the minimum voting age in Kenya?', ARRAY['18', '16', '21', '20'], 0, 'Kenyans may vote from age 18.'),
((SELECT id FROM quiz), 'Who is responsible for national defense?', ARRAY['National government', 'County government', 'Ward administrators', 'Village councils'], 0, 'Defense is a function of the national government.'),
((SELECT id FROM quiz), 'Paying taxes is which type of duty?', ARRAY['Civic and legal duty', 'Optional', 'Religious duty', 'Corporate duty'], 0, 'Tax payment is a civic and legal obligation.');

-- ====== BIASHARA ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Starting a Business', 'starting-a-business', 'Practical steps to register and run a business in Kenya', 'biashara', 'easy', 5, 5, 10, 'en'),
('Digital Payments', 'digital-payments', 'Modern payment systems shaping Kenyan commerce', 'biashara', 'medium', 5, 6, 15, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Starting a Business' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Where do you register a company in Kenya?', ARRAY['eCitizen (BRS)', 'Nairobi Stock Exchange', 'CBK', 'KRA only'], 0, 'Company registration runs through eCitizen/BRS.'),
((SELECT id FROM quiz), 'What is a business plan used for?', ARRAY['Guiding strategy and attracting investors', 'Paying tax', 'Registering land', 'Getting an ID'], 0, 'A business plan guides strategy and funding.'),
((SELECT id FROM quiz), 'Which license do small retailers usually need?', ARRAY['Single Business Permit', 'Mining license', 'Import license', 'Veterinary license'], 0, 'Retailers typically need a Single Business Permit.'),
((SELECT id FROM quiz), 'What does a PIN from KRA enable?', ARRAY['Paying taxes and filing returns', 'Opening a bank account only', 'Trading on NSE', 'Getting a passport'], 0, 'The KRA PIN is used for tax compliance.'),
((SELECT id FROM quiz), 'Which is the cheapest legal business structure to start?', ARRAY['Sole proprietorship', 'Public limited company', 'Trust', 'Cooperative'], 0, 'A sole proprietorship is the simplest structure.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Digital Payments' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is a payment gateway?', ARRAY['Software that processes online payments', 'A bank branch', 'A cash machine', 'A loan app'], 0, 'A gateway processes online transactions.'),
((SELECT id FROM quiz), 'Which platform enables QR-code payments in Kenya?', ARRAY['Lipa Na M-PESA', 'eCitizen', 'iTax', 'NIIMS'], 0, 'Lipa Na M-PESA supports QR-based payments.'),
((SELECT id FROM quiz), 'What is a "token" in card payments?', ARRAY['A secure stand-in for card data', 'A lottery prize', 'A discount code', 'A receipt'], 0, 'Tokens replace sensitive card data during payments.'),
((SELECT id FROM quiz), 'What does "POS" stand for?', ARRAY['Point of Sale', 'Payment of Services', 'Purchase of Stock', 'Provision of Sales'], 0, 'POS terminals process in-store card payments.'),
((SELECT id FROM quiz), 'Which body licenses payment service providers?', ARRAY['CBK', 'IEBC', 'SASRA', 'NSE'], 0, 'The Central Bank of Kenya licenses PSPs.');

-- ====== TECH ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Digital Security', 'digital-security', 'Staying safe online in Kenya', 'tech', 'medium', 5, 6, 15, 'en'),
('Local Apps', 'local-apps', 'Kenyan apps that changed the world', 'tech', 'easy', 5, 5, 10, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Digital Security' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the best way to create strong passwords?', ARRAY['Use a passphrase or password manager', 'Use your name', 'Use 123456', 'Use your phone number'], 0, 'Strong unique passphrases or a manager are best.'),
((SELECT id FROM quiz), 'What should you do if you receive a suspicious M-Pesa link?', ARRAY['Do not tap it; report it', 'Tap to check', 'Forward to friends', 'Reply with PIN'], 0, 'Never open suspicious links; report them.'),
((SELECT id FROM quiz), 'What is "SIM swap" fraud?', ARRAY['An attacker takes over your SIM number', 'Changing network speed', 'Buying a new SIM', 'Roaming abroad'], 0, 'SIM swap fraud lets attackers intercept your OTPs.'),
((SELECT id FROM quiz), 'What does a firewall do?', ARRAY['Blocks unauthorized network access', 'Speeds up the internet', 'Stores files', 'Creates passwords'], 0, 'Firewalls filter traffic to block intrusions.'),
((SELECT id FROM quiz), 'Why should you update your phone regularly?', ARRAY['To patch security holes', 'To change the theme', 'To delete apps', 'To use more data'], 0, 'Updates fix security vulnerabilities.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Local Apps' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which Kenyan app pioneered mobile money?', ARRAY['M-PESA', 'Equitel', 'Tala', 'Bolt'], 0, 'M-PESA launched mobile money in 2007.'),
((SELECT id FROM quiz), 'Which Kenyan startup became a global delivery brand?', ARRAY['M-KOPA', 'Twiga Foods', 'Cellulant', 'Sendy'], 0, 'Twiga Foods connects farmers to markets digitally.'),
((SELECT id FROM quiz), 'What does M-KOPA provide?', ARRAY['Pay-as-you-go solar power', 'Free Wi-Fi', 'Ride hailing', 'Online courses'], 0, 'M-KOPA sells solar energy on credit plans.'),
((SELECT id FROM quiz), 'Which app popularized boda-boda hailing in Kenya?', ARRAY['SafeBoda', 'eCitizen', 'iTax', 'MyGov'], 0, 'SafeBoda is a leading boda-boda hailing app.'),
((SELECT id FROM quiz), 'What is USSD used for?', ARRAY['Menu-based phone services without internet', 'Video calls', 'Sending emails', 'GPS tracking'], 0, 'USSD delivers phone menus even without data.');

-- ====== HEALTH ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('First Aid', 'first-aid', 'Life-saving first aid every Kenyan should know', 'health', 'easy', 5, 5, 10, 'en'),
('Mental Wellness', 'mental-wellness', 'Understanding mental health in Kenyan communities', 'health', 'medium', 5, 6, 15, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'First Aid' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the first step in an emergency?', ARRAY['Check the scene is safe', 'Call for water', 'Move the victim', 'Take photos'], 0, 'Always ensure the area is safe first.'),
((SELECT id FROM quiz), 'What does CPR stand for?', ARRAY['Cardiopulmonary resuscitation', 'Cardiac pressure relief', 'Central pulse response', 'Chest pain remedy'], 0, 'CPR restores heartbeat and breathing.'),
((SELECT id FROM quiz), 'How many chest compressions per minute in adult CPR?', ARRAY['100-120', '30-40', '60-70', '150-200'], 0, 'Adult compressions should run at 100-120 per minute.'),
((SELECT id FROM quiz), 'What should you do for a nosebleed?', ARRAY['Lean forward and pinch the nose', 'Lean back and swallow', 'Blow the nose', 'Apply ice to the ears'], 0, 'Lean forward and pinch the nose to stop bleeding.'),
((SELECT id FROM quiz), 'Which number is Kenya''s emergency line?', ARRAY['999 or 112', '555', '121', '0800'], 0, 'Kenya uses 999/112 for emergencies.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Mental Wellness' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the most common mental health condition?', ARRAY['Depression', 'Malaria', 'Diabetes', 'Typhoid'], 0, 'Depression is the most common mental health disorder.'),
((SELECT id FROM quiz), 'Where can Kenyans get free mental health support?', ARRAY['Government health facilities', 'Only private clinics', 'Community pharmacies', 'Saloons'], 0, 'Public health facilities offer mental health services.'),
((SELECT id FROM quiz), 'What is a healthy way to reduce stress?', ARRAY['Regular exercise', 'Skipping sleep', 'Excess alcohol', 'Isolation'], 0, 'Exercise is proven to reduce stress.'),
((SELECT id FROM quiz), 'Who can help if a friend is suicidal?', ARRAY['Talk to them and seek professional help', 'Ignore them', 'Spread the news', 'Wait a week'], 0, 'Reach out and connect them with professionals.'),
((SELECT id FROM quiz), 'What is "burnout"?', ARRAY['Exhaustion from chronic stress', 'A skin condition', 'A fever', 'A sleep disorder'], 0, 'Burnout is long-term stress-related exhaustion.');

-- ====== ENVIRONMENT ======
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Water Conservation', 'water-conservation', 'Protecting Kenya''s water towers and rivers', 'environment', 'medium', 5, 6, 15, 'en'),
('Waste Management', 'waste-management', 'Better waste handling for cleaner communities', 'environment', 'easy', 5, 5, 10, 'en')
ON CONFLICT (slug) DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Water Conservation' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What are Kenya''s five water towers?', ARRAY['Mau Forest, Aberdares, Mt Kenya, Cherangani, Mt Elgon', 'Naivasha, Nakuru, Turkana, Baringo, Magadi', 'Tsavo, Amboseli, Mara, Samburu, Meru', 'Coast, Rift, Eastern, Nyanza, Western'], 0, 'These forests supply most of Kenya''s rivers.'),
((SELECT id FROM quiz), 'Why are wetlands important?', ARRAY['They filter water and control floods', 'They attract tourists only', 'They store salt', 'They cool the air'], 0, 'Wetlands purify water and buffer flooding.'),
((SELECT id FROM quiz), 'What is "rainwater harvesting"?', ARRAY['Collecting rainwater for reuse', 'Making it rain', 'Blocking rivers', 'Desalination'], 0, 'Rainwater harvesting captures rain for home use.'),
((SELECT id FROM quiz), 'Which river is critical to Nairobi''s water supply?', ARRAY['Sasumua/Thika rivers', 'Tana', 'Athi', 'Mara'], 0, 'The Sasumua and Thika catchments supply Nairobi.'),
((SELECT id FROM quiz), 'What causes rivers to silt heavily?', ARRAY['Deforestation and soil erosion', 'Heavy fish stocking', 'Cool weather', 'Stone buildings'], 0, 'Removing trees accelerates soil runoff into rivers.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Waste Management' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the most sustainable waste hierarchy step?', ARRAY['Reduce', 'Burn', 'Bury', 'Export'], 0, 'Reducing waste at source is the top priority.'),
((SELECT id FROM quiz), 'What does "recycling" mean?', ARRAY['Turning waste into new products', 'Throwing waste away', 'Burning waste', 'Dumping in rivers'], 0, 'Recycling reprocesses waste into new goods.'),
((SELECT id FROM quiz), 'What is "composting" good for?', ARRAY['Turning organic waste into fertilizer', 'Plastic disposal', 'Burning trash', 'Making packaging'], 0, 'Compost converts food scraps into soil nutrients.'),
((SELECT id FROM quiz), 'Which type of plastic is usually not recycled in Kenya?', ARRAY['Laminated carrier bags', 'PET bottles', 'HDPE containers', 'LDPE film'], 0, 'Laminated bags are hard to recycle.'),
((SELECT id FROM quiz), 'What is e-waste?', ARRAY['Discarded electronics', 'Electric fences', 'Food waste', 'Paper waste'], 0, 'E-waste is discarded electronic devices.');
