-- Seed quizzes with diverse content for all categories
-- Clear existing seed data to allow re-run safely
DELETE FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE slug IN ('counties-101','county-capitals','county-geography','counties-za-kenya','miji-mikuu-ya-kaunti','farm-basics','crop-science','livestock-management','kenyan-traditions','music-and-arts','utamaduni-na-mila','know-your-rights','legal-system','constitution-2010','business-basics','saccos-and-savings','digital-finance','silicon-savannah','digital-skills','innovation-hub','health-essentials','public-health','afya-na-ustawi','conservation-101','climate-action','wildlife-and-parks'));
DELETE FROM quizzes WHERE slug IN ('counties-101','county-capitals','county-geography','counties-za-kenya','miji-mikuu-ya-kaunti','farm-basics','crop-science','livestock-management','kenyan-traditions','music-and-arts','utamaduni-na-mila','know-your-rights','legal-system','constitution-2010','business-basics','saccos-and-savings','digital-finance','silicon-savannah','digital-skills','innovation-hub','health-essentials','public-health','afya-na-ustawi','conservation-101','climate-action','wildlife-and-parks');
-- COUNTIES quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Counties 101', 'counties-101', 'Test your knowledge of Kenya''s 47 counties', 'counties', 'easy', 5, 5, 10, 'en'),
('County Capitals', 'county-capitals', 'Match counties with their headquarters', 'counties', 'medium', 6, 7, 15, 'en'),
('County Geography', 'county-geography', 'Deep dive into Kenya''s geographic diversity', 'counties', 'hard', 5, 8, 20, 'en'),
('Counties za Kenya', 'counties-za-kenya', 'Jaribu ujuzi wako kuhusu kaunti za Kenya', 'counties', 'easy', 5, 5, 10, 'sw'),
('Miji Mikuu ya Kaunti', 'miji-mikuu-ya-kaunti', 'Linganisha kaunti na mji mkuu wake', 'counties', 'medium', 6, 7, 15, 'sw')
ON CONFLICT (slug) DO NOTHING;

-- AGRICULTURE quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Farm Basics', 'farm-basics', 'Essential knowledge for Kenyan farmers', 'agriculture', 'easy', 5, 5, 10, 'en'),
('Crop Science', 'crop-science', 'Advanced agricultural practices', 'agriculture', 'medium', 6, 8, 15, 'en'),
('Livestock Management', 'livestock-management', 'Best practices for raising livestock in Kenya', 'agriculture', 'hard', 5, 8, 20, 'en')
ON CONFLICT (slug) DO NOTHING;

-- CULTURE quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Kenyan Traditions', 'kenyan-traditions', 'Explore the rich cultural heritage of Kenya', 'culture', 'easy', 5, 5, 10, 'en'),
('Music & Arts', 'music-and-arts', 'Kenya''s vibrant music and arts scene', 'culture', 'medium', 6, 7, 15, 'en'),
('Utamaduni na Mila', 'utamaduni-na-mila', 'Jifunze kuhusu utamaduni wa Kenya', 'culture', 'easy', 5, 5, 10, 'sw')
ON CONFLICT (slug) DO NOTHING;

-- RIGHTS quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Know Your Rights', 'know-your-rights', 'Understand your constitutional rights in Kenya', 'rights', 'easy', 5, 5, 10, 'en'),
('Legal System', 'legal-system', 'How Kenya''s court system works', 'rights', 'medium', 6, 8, 15, 'en'),
('Constitution 2010', 'constitution-2010', 'Key facts about Kenya''s constitution', 'rights', 'hard', 5, 8, 20, 'en')
ON CONFLICT (slug) DO NOTHING;

-- BIASHARA quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Business Basics', 'business-basics', 'Start and grow your business in Kenya', 'biashara', 'easy', 5, 5, 10, 'en'),
('SACCOs & Savings', 'saccos-and-savings', 'Understanding cooperative finance', 'biashara', 'medium', 5, 7, 15, 'en'),
('Digital Finance', 'digital-finance', 'Mobile money and fintech in Kenya', 'biashara', 'medium', 6, 7, 15, 'en')
ON CONFLICT (slug) DO NOTHING;

-- TECH quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Silicon Savannah', 'silicon-savannah', 'Kenya''s technology ecosystem', 'tech', 'easy', 5, 5, 10, 'en'),
('Digital Skills', 'digital-skills', 'Essential digital literacy for Kenyans', 'tech', 'medium', 6, 7, 15, 'en'),
('Innovation Hub', 'innovation-hub', 'Kenya''s role in African tech innovation', 'tech', 'hard', 5, 8, 20, 'en')
ON CONFLICT (slug) DO NOTHING;

-- HEALTH quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Health Essentials', 'health-essentials', 'Basic health knowledge for every Kenyan', 'health', 'easy', 5, 5, 10, 'en'),
('Public Health', 'public-health', 'Community health and disease prevention', 'health', 'medium', 6, 8, 15, 'en'),
('Afya na Ustawi', 'afya-na-ustawi', 'Jifunze kuhusu afya bora', 'health', 'easy', 5, 5, 10, 'sw')
ON CONFLICT (slug) DO NOTHING;

-- ENVIRONMENT quizzes
INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, language) VALUES
('Conservation 101', 'conservation-101', 'Protecting Kenya''s natural environment', 'environment', 'easy', 5, 5, 10, 'en'),
('Climate Action', 'climate-action', 'Understanding climate change in Kenya', 'environment', 'medium', 6, 8, 15, 'en'),
('Wildlife & Parks', 'wildlife-and-parks', 'Kenya''s national parks and wildlife', 'environment', 'easy', 5, 5, 10, 'en')
ON CONFLICT (slug) DO NOTHING;

-- Quiz questions for COUNTIES
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Counties 101' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'How many counties does Kenya have?', ARRAY['47', '45', '50', '42'], 0, 'Kenya has 47 counties established under the 2010 Constitution.'),
((SELECT id FROM quiz), 'Which is the largest county by area?', ARRAY['Turkana', 'Marsabit', 'Nairobi', 'Kitui'], 0, 'Turkana County is the largest at approximately 71,000 square kilometers.'),
((SELECT id FROM quiz), 'Which is the smallest county by area?', ARRAY['Mombasa', 'Nairobi', 'Vihiga', 'Siaya'], 2, 'Vihiga County is the smallest at about 531 square kilometers.'),
((SELECT id FROM quiz), 'Which county has the highest population?', ARRAY['Nairobi', 'Kiambu', 'Nakuru', 'Kakamega'], 0, 'Nairobi County is the most populous with over 4 million residents.'),
((SELECT id FROM quiz), 'Which county is known as the "Green City in the Sun"?', ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'], 0, 'Nairobi is known as the Green City in the Sun.')
ON CONFLICT DO NOTHING;

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'County Capitals' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the capital of Kisumu County?', ARRAY['Kisumu', 'Siaya', 'Homa Bay', 'Migori'], 0, 'Kisumu City is the capital of Kisumu County.'),
((SELECT id FROM quiz), 'What is the capital of Nakuru County?', ARRAY['Nakuru', 'Naivasha', 'Gilgil', 'Molo'], 0, 'Nakuru City is the county headquarters.'),
((SELECT id FROM quiz), 'What is the capital of Uasin Gishu County?', ARRAY['Eldoret', 'Iten', 'Kapsabet', 'Kitale'], 0, 'Eldoret is the capital of Uasin Gishu County.'),
((SELECT id FROM quiz), 'What is the capital of Kilifi County?', ARRAY['Kilifi', 'Malindi', 'Mombasa', 'Watamu'], 0, 'Kilifi town is the capital of Kilifi County.'),
((SELECT id FROM quiz), 'What is the capital of Meru County?', ARRAY['Meru', 'Nanyuki', 'Isiolo', 'Maua'], 0, 'Meru town serves as the county headquarters.'),
((SELECT id FROM quiz), 'What is the capital of Laikipia County?', ARRAY['Rumuruti', 'Nanyuki', 'Nyahururu', 'Naro Moru'], 0, 'Rumuruti is the capital of Laikipia County.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'County Geography' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which county hosts the Maasai Mara National Reserve?', ARRAY['Narok', 'Kajiado', 'Nakuru', 'Laikipia'], 0, 'The Maasai Mara is in Narok County.'),
((SELECT id FROM quiz), 'Turkana County is famous for which natural resource?', ARRAY['Oil', 'Gold', 'Diamonds', 'Coal'], 0, 'Turkana has significant oil deposits in the South Lokichar Basin.'),
((SELECT id FROM quiz), 'Which county contains Mount Kenya?', ARRAY['Meru', 'Nyeri', 'Kirinyaga', 'All of the above'], 3, 'Mount Kenya spans Meru, Nyeri, Kirinyaga, Embu, and Tharaka Nithi counties.'),
((SELECT id FROM quiz), 'Which county borders Lake Victoria?', ARRAY['Kisumu', 'Siaya', 'Homa Bay', 'All of the above'], 3, 'Multiple counties border Lake Victoria including Kisumu, Siaya, Homa Bay, and Migori.'),
((SELECT id FROM quiz), 'Which county is known for its white sand beaches?', ARRAY['Mombasa', 'Kilifi', 'Kwale', 'All of the above'], 3, 'Kenya''s coast has beautiful beaches in Mombasa, Kilifi, Kwale, and Lamu counties.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Counties za Kenya' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Kenya ina kaunti ngapi?', ARRAY['47', '45', '50', '42'], 0, 'Kenya ina kaunti 47 kama ilivyowekwa na Katiba ya 2010.'),
((SELECT id FROM quiz), 'Kaunti ipi ni kubwa zaidi kwa eneo?', ARRAY['Turkana', 'Marsabit', 'Nairobi', 'Kitui'], 0, 'Kaunti ya Turkana ndio kubwa zaidi kwa eneo.'),
((SELECT id FROM quiz), 'Kaunti ipi ina wakazi wengi zaidi?', ARRAY['Nairobi', 'Kiambu', 'Nakuru', 'Mombasa'], 0, 'Nairobi ina wakazi zaidi ya milioni 4.'),
((SELECT id FROM quiz), 'Mombasa inajulikana kwa sanamu gani ya kihistoria?', ARRAY['Fort Jesus', 'Gede Ruins', 'Thimlich Ohinga', 'Koobi Fora'], 0, 'Fort Jesus ni tovuti ya UNESCO Mombasa.'),
((SELECT id FROM quiz), 'Kaunti ipi inaitwa "Green City in the Sun"?', ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'], 0, 'Nairobi inajulikana kama Green City in the Sun.');

-- Questions for AGRICULTURE quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Farm Basics' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which region is known as Kenya''s breadbasket?', ARRAY['Rift Valley', 'Coast', 'Eastern', 'Nyanza'], 0, 'The Rift Valley is Kenya''s primary agricultural zone.'),
((SELECT id FROM quiz), 'What is the main cash crop in central Kenya?', ARRAY['Tea', 'Coffee', 'Sugarcane', 'Cotton'], 1, 'Coffee is a major cash crop in central Kenya.'),
((SELECT id FROM quiz), 'Which farming method is most sustainable for small-scale farmers?', ARRAY['Crop rotation', 'Monocropping', 'Slash and burn', 'Overgrazing'], 0, 'Crop rotation maintains soil fertility.'),
((SELECT id FROM quiz), 'What is "shamba system" in Kenya?', ARRAY['Growing crops under trees', 'Irrigation farming', 'Greenhouse farming', 'Hydroponics'], 0, 'The shamba system involves intercropping during tree establishment.'),
((SELECT id FROM quiz), 'Which county leads in tea production?', ARRAY['Kericho', 'Nandi', 'Kiambu', 'Muranga'], 0, 'Kericho County is Kenya''s leading tea producer.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Crop Science' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the best planting season for maize in Kenya?', ARRAY['March-May', 'June-August', 'September-November', 'December-February'], 0, 'The long rains season (March-May) is the main maize planting season.'),
((SELECT id FROM quiz), 'What does "drip irrigation" conserve most?', ARRAY['Water', 'Soil', 'Fertilizer', 'Seeds'], 0, 'Drip irrigation delivers water directly to roots, minimizing waste.'),
((SELECT id FROM quiz), 'Which pest commonly attacks Kenyan maize farms?', ARRAY['Fall armyworm', 'Locusts', 'Aphids', 'Whiteflies'], 0, 'Fall armyworm is a major maize pest in Kenya.'),
((SELECT id FROM quiz), 'What is the ideal pH range for most Kenyan crops?', ARRAY['5.5-7.0', '3.0-4.5', '8.0-9.5', '2.0-3.5'], 0, 'Most crops thrive in slightly acidic to neutral soil (pH 5.5-7.0).'),
((SELECT id FROM quiz), 'Which fertilizer is richest in nitrogen?', ARRAY['CAN', 'DAP', 'NPK 23:23:0', 'Urea'], 3, 'Urea contains 46% nitrogen, the highest among common fertilizers.'),
((SELECT id FROM quiz), 'What is "grafting" used for in horticulture?', ARRAY['Combining two plants', 'Pruning branches', 'Adding fertilizer', 'Controlling pests'], 0, 'Grafting joins two plants to combine desirable traits.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Livestock Management' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the most common breed of dairy cattle in Kenya?', ARRAY['Friesian', 'Sahiwal', 'Boran', 'Zebu'], 0, 'Friesian cows are the most common dairy breed in Kenya.'),
((SELECT id FROM quiz), 'What disease commonly affects poultry in Kenya?', ARRAY['Newcastle disease', 'Foot and mouth', 'East Coast fever', 'Trypanosomiasis'], 0, 'Newcastle disease is a major threat to Kenyan poultry.'),
((SELECT id FROM quiz), 'What is "zero grazing" in livestock farming?', ARRAY['Confined feeding system', 'Free-range grazing', 'Rotational grazing', 'Pasture farming'], 0, 'Zero grazing involves keeping animals in confined areas and bringing feed to them.'),
((SELECT id FROM quiz), 'Which vaccine is mandatory for cattle in Kenya?', ARRAY['Rinderpest', 'Anthrax', 'Brucellosis', 'All of the above'], 3, 'Multiple vaccines are required including rinderpest, anthrax, and brucellosis.'),
((SELECT id FROM quiz), 'What is the gestation period for a cow?', ARRAY['9 months', '5 months', '12 months', '7 months'], 0, 'A cow''s gestation period is approximately 9 months.');

-- Questions for CULTURE quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Kenyan Traditions' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the traditional Kenyan cloth known as?', ARRAY['Kitenge', 'Kente', 'Dashiki', 'Kikoy'], 0, 'Kitenge is a vibrant East African fabric.'),
((SELECT id FROM quiz), 'What is "Nyama Choma" in Kenyan culture?', ARRAY['Roasted meat', 'Fried fish', 'Vegetable stew', 'Ugali'], 0, 'Nyama Choma (roasted meat) is a beloved Kenyan social dish.'),
((SELECT id FROM quiz), 'Which community performs the "Adumu" jumping dance?', ARRAY['Maasai', 'Kikuyu', 'Luo', 'Kamba'], 0, 'The Maasai are known for the adumu (jumping) dance.'),
((SELECT id FROM quiz), 'What is "Ugali" made from?', ARRAY['Maize flour', 'Wheat flour', 'Rice flour', 'Cassava flour'], 0, 'Ugali is made from maize flour (cornmeal) cooked with water.'),
((SELECT id FROM quiz), 'Which community celebrates "Tero Buru"?', ARRAY['Luo', 'Kikuyu', 'Kalenjin', 'Mijikenda'], 0, 'Tero buru is a Luo funeral ceremony honoring the departed.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Music & Arts' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which genre of music originated in Kenya?', ARRAY['Benga', 'Afrobeat', 'Highlife', 'Mbalax'], 0, 'Benga is a Kenyan musical genre originating from the Luo community.'),
((SELECT id FROM quiz), 'Who is known as the "King of Benga"?', ARRAY['DO Misiani', 'Fadhili William', 'Joseph Kamaru', 'Johnny Junior'], 0, 'DO Misiani is celebrated as the king of Benga.'),
((SELECT id FROM quiz), 'What is "Kapuka" in Kenyan music?', ARRAY['A genre of rap', 'A traditional dance', 'A musical instrument', 'A festival'], 0, 'Kapuka is a Kenyan hip-hop subgenre popularized in the 2000s.'),
((SELECT id FROM quiz), 'Which Kenyan artist won a BET Award?', ARRAY['Sauti Sol', 'Nameless', 'Wahu', 'Akothee'], 0, 'Sauti Sol won the BET International Act award.'),
((SELECT id FROM quiz), 'What traditional instrument is made from a cow horn?', ARRAY['Kudu horn', 'Nyatiti', 'Orutu', 'Endo'], 0, 'The kudu horn (coro) is a traditional wind instrument.'),
((SELECT id FROM quiz), 'Kenyans celebrate Music Day on which date?', ARRAY['July 1', 'October 10', 'June 1', 'August 8'], 1, 'October 10 is Kenya''s Music Day (Mazingira Day).');

-- Questions for RIGHTS quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Know Your Rights' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is Kenya''s highest court?', ARRAY['Supreme Court', 'Court of Appeal', 'High Court', 'Chief Magistrate Court'], 0, 'The Supreme Court is Kenya''s highest judicial authority.'),
((SELECT id FROM quiz), 'The Kenyan Constitution was promulgated in which year?', ARRAY['2010', '2008', '2013', '2005'], 0, 'The Constitution was promulgated on August 27, 2010.'),
((SELECT id FROM quiz), 'How many chapters does the Kenyan Constitution have?', ARRAY['18', '15', '20', '12'], 0, 'The Constitution has 18 chapters covering all aspects of governance.'),
((SELECT id FROM quiz), 'What does Article 27 of the Constitution guarantee?', ARRAY['Equality and freedom from discrimination', 'Freedom of speech', 'Right to education', 'Right to healthcare'], 0, 'Article 27 guarantees equality and freedom from discrimination.'),
((SELECT id FROM quiz), 'What is the "Bill of Rights" in Kenya?', ARRAY['Chapter Four of the Constitution', 'A separate law', 'A presidential decree', 'A parliamentary act'], 0, 'The Bill of Rights is contained in Chapter Four of the Constitution.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Legal System' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the role of the Director of Public Prosecutions?', ARRAY['Prosecute criminal cases', 'Defend accused persons', 'Preside over trials', 'Make laws'], 0, 'The DPP has authority to prosecute criminal cases.'),
((SELECT id FROM quiz), 'How many judges are in the Supreme Court?', ARRAY['7', '5', '9', '11'], 0, 'The Supreme Court has 7 judges including the Chief Justice.'),
((SELECT id FROM quiz), 'What is "habeas corpus"?', ARRAY['A right to challenge unlawful detention', 'A type of court order', 'A criminal charge', 'A legal fee'], 0, 'Habeas corpus allows a person to challenge unlawful detention.'),
((SELECT id FROM quiz), 'Who appoints the Chief Justice of Kenya?', ARRAY['The President', 'The Judicial Service Commission', 'The Parliament', 'The Attorney General'], 0, 'The President appoints the Chief Justice following JSC recommendations.'),
((SELECT id FROM quiz), 'What court handles children''s cases?', ARRAY['Children''s Court', 'Juvenile Court', 'Family Court', 'Magistrate Court'], 0, 'The Children''s Court handles cases involving minors.'),
((SELECT id FROM quiz), 'What is "Alternative Justice System" in Kenya?', ARRAY['Traditional dispute resolution', 'Online courts', 'Plea bargaining', 'Arbitration'], 0, 'AJS incorporates traditional and community-based dispute resolution.');

-- Questions for BIASHARA quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Business Basics' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What does "SACCO" stand for?', ARRAY['Savings and Credit Cooperative', 'Small African Commerce Organization', 'Strategic Advisory Committee', 'Savings Association'], 0, 'SACCOs are member-owned financial cooperatives popular in Kenya.'),
((SELECT id FROM quiz), 'What is the registration body for businesses in Kenya?', ARRAY['Business Registration Service', 'Kenya Revenue Authority', 'Nairobi Securities Exchange', 'Central Bank'], 0, 'BRS handles business registration in Kenya.'),
((SELECT id FROM quiz), 'What is a "Single Business Permit"?', ARRAY['A license to operate a business', 'A tax clearance certificate', 'A loan application', 'A partnership agreement'], 0, 'Single Business Permit is required to operate a business in Kenyan counties.'),
((SELECT id FROM quiz), 'What is the standard VAT rate in Kenya?', ARRAY['16%', '14%', '18%', '20%'], 0, 'The standard VAT rate in Kenya is 16%.'),
((SELECT id FROM quiz), 'What does "MPESA" stand for?', ARRAY['Mobile Pesha', 'Mobile Money', 'Money Payment', 'M-Pesa has no full form'], 3, 'M-Pesa is a brand name and does not have an official expanded form.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'SACCOs & Savings' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the minimum number of members to form a SACCO?', ARRAY['10', '5', '25', '30'], 0, 'At least 10 members are required to form a SACCO in Kenya.'),
((SELECT id FROM quiz), 'Which body regulates SACCOs in Kenya?', ARRAY['SASRA', 'CBK', 'IRA', 'KRA'], 0, 'SASRA (Sacco Societies Regulatory Authority) regulates SACCOs.'),
((SELECT id FROM quiz), 'What is "FOSA" in SACCO operations?', ARRAY['Front Office Services Activity', 'Financial Operations Standard Audit', 'Fund Origination and Savings Account', 'Full Online Services Access'], 0, 'FOSA refers to the front office banking services offered by SACCOs.'),
((SELECT id FROM quiz), 'What is the main advantage of joining a SACCO?', ARRAY['Access to affordable credit', 'High interest on savings', 'Free insurance', 'Tax exemption'], 0, 'SACCOs provide members with access to affordable credit.'),
((SELECT id FROM quiz), 'What does "BOSA" refer to?', ARRAY['Back Office Services Activity', 'Basic Operating Services Agency', 'Branch Office Supervisory Authority', 'Banking and Savings Office'], 0, 'BOSA is the back office (non-banking) operations of a SACCO.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Digital Finance' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which mobile lending app is most popular in Kenya?', ARRAY['M-Shwari', 'Tala', 'Fuliza', 'Branch'], 0, 'M-Shwari is a mobile savings and loan service through M-Pesa.'),
((SELECT id FROM quiz), 'What is the daily M-Pesa transaction limit?', ARRAY['KES 300,000', 'KES 150,000', 'KES 500,000', 'KES 70,000'], 0, 'The daily M-Pesa transaction limit is KES 300,000.'),
((SELECT id FROM quiz), 'What is "Fuliza"?', ARRAY['An overdraft service on M-Pesa', 'A savings account', 'A health insurance plan', 'A school fees payment service'], 0, 'Fuliza is M-Pesa''s overdraft facility.'),
((SELECT id FROM quiz), 'Which Kenyan bank pioneered agency banking?', ARRAY['Equity Bank', 'KCB', 'Cooperative Bank', 'Barclays'], 0, 'Equity Bank pioneered the agency banking model in Kenya.'),
((SELECT id FROM quiz), 'What is "PesaLink"?', ARRAY['An interbank real-time payment system', 'A mobile loan app', 'A cryptocurrency', 'A savings product'], 0, 'PesaLink enables real-time interbank transfers in Kenya.'),
((SELECT id FROM quiz), 'What does "API" stand for in fintech?', ARRAY['Application Programming Interface', 'Automated Payment Integration', 'Advanced Processing Infrastructure', 'Account Protection Initiative'], 0, 'API enables different software applications to communicate.');

-- Questions for TECH quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Silicon Savannah' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Kenya''s "Silicon Savannah" is centered around which city?', ARRAY['Nairobi', 'Mombasa', 'Eldoret', 'Kisumu'], 0, 'Nairobi is the hub of Kenya''s tech ecosystem.'),
((SELECT id FROM quiz), 'Which Kenyan fintech pioneered mobile money?', ARRAY['M-Pesa', 'Airtel Money', 'Equitel', 'T-Kash'], 0, 'M-Pesa by Safaricom revolutionized mobile money since 2007.'),
((SELECT id FROM quiz), 'What is "Konza Technopolis"?', ARRAY['A smart city project', 'A tech incubator', 'A university', 'A research lab'], 0, 'Konza Technopolis is Kenya''s flagship smart city project.'),
((SELECT id FROM quiz), 'Which Kenyan startup became the first "unicorn"?', ARRAY['None yet', 'Twiga Foods', 'uBongo', 'Cellulant'], 0, 'As of 2024, Kenya has not yet produced a unicorn startup.'),
((SELECT id FROM quiz), 'What does "ICT" stand for in Kenya''s context?', ARRAY['Information and Communications Technology', 'International Computing Training', 'Integrated Computer Terminal', 'Internet and Communication Tools'], 0, 'ICT is the standard term for technology and communications.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Digital Skills' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What does "URL" stand for?', ARRAY['Uniform Resource Locator', 'Universal Resource Link', 'Unified Remote Login', 'Universal Reference Library'], 0, 'URL is the address of a web page.'),
((SELECT id FROM quiz), 'What is "phishing" in cybersecurity?', ARRAY['A fake attempt to steal personal data', 'A type of computer virus', 'A firewall setting', 'An encryption method'], 0, 'Phishing tricks users into revealing sensitive information.'),
((SELECT id FROM quiz), 'What does "cloud computing" mean?', ARRAY['Storing and accessing data over the internet', 'Computing weather patterns', 'Using physical servers', 'Offline data processing'], 0, 'Cloud computing delivers computing services over the internet.'),
((SELECT id FROM quiz), 'What is a "spreadsheet" used for?', ARRAY['Organizing data in rows and columns', 'Writing documents', 'Designing graphics', 'Sending emails'], 0, 'Spreadsheets are used for data organization and calculation.'),
((SELECT id FROM quiz), 'What does "WiFi" allow you to do?', ARRAY['Connect to internet wirelessly', 'Make phone calls', 'Watch television', 'Charge devices'], 0, 'WiFi enables wireless internet connectivity.'),
((SELECT id FROM quiz), 'What is "two-factor authentication"?', ARRAY['An extra layer of security', 'Two devices connected', 'A dual SIM feature', 'A file compression method'], 0, '2FA adds a second verification step beyond password.');

-- Questions for HEALTH quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Health Essentials' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the leading cause of malaria in Kenya?', ARRAY['Mosquito bites', 'Contaminated water', 'Airborne viruses', 'Food poisoning'], 0, 'Malaria is transmitted through infected mosquito bites.'),
((SELECT id FROM quiz), 'Kenya''s universal healthcare program is called?', ARRAY['UHC', 'Afya House', 'Linda Mama', 'NHIF'], 0, 'Universal Health Coverage (UHC) is Kenya''s flagship health program.'),
((SELECT id FROM quiz), 'How often should you wash your hands to prevent disease?', ARRAY['Regularly with soap and water', 'Once a day', 'Only before meals', 'When visibly dirty'], 0, 'Regular handwashing with soap prevents disease transmission.'),
((SELECT id FROM quiz), 'What vaccine protects against tuberculosis?', ARRAY['BCG', 'Polio', 'Measles', 'Tetanus'], 0, 'The BCG vaccine protects against tuberculosis.'),
((SELECT id FROM quiz), 'What is the main symptom of dehydration?', ARRAY['Thirst and dark urine', 'Headache', 'Fever', 'Cough'], 0, 'Thirst and dark-colored urine are key signs of dehydration.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Public Health' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the main cause of cholera outbreaks in Kenya?', ARRAY['Contaminated water', 'Mosquito bites', 'Air pollution', 'Physical contact'], 0, 'Cholera spreads through contaminated water sources.'),
((SELECT id FROM quiz), 'What does "HIV" stand for?', ARRAY['Human Immunodeficiency Virus', 'Human Infection Virus', 'Hereditary Immune Virus', 'Health Improvement Vaccine'], 0, 'HIV attacks the body''s immune system.'),
((SELECT id FROM quiz), 'How is tuberculosis transmitted?', ARRAY['Through the air when infected person coughs', 'Through blood transfusion', 'Through contaminated food', 'Through insect bites'], 0, 'TB spreads through airborne droplets from coughs or sneezes.'),
((SELECT id FROM quiz), 'What is the recommended duration of exclusive breastfeeding?', ARRAY['6 months', '3 months', '12 months', '9 months'], 0, 'WHO recommends exclusive breastfeeding for the first 6 months.'),
((SELECT id FROM quiz), 'What is "Community Health Volunteer" (CHV) role?', ARRAY['Provide basic healthcare at community level', 'Work in hospitals only', 'Prescribe medication', 'Perform surgeries'], 0, 'CHVs are community-based health workers providing primary care.'),
((SELECT id FROM quiz), 'Which mosquito borne disease has a vaccine in Kenya?', ARRAY['Yellow fever', 'Malaria', 'Dengue', 'Zika'], 0, 'Yellow fever vaccine is available and recommended in Kenya.');

-- Questions for ENVIRONMENT quizzes
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Conservation 101' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which is Kenya''s highest mountain?', ARRAY['Mt Kenya', 'Mt Kilimanjaro', 'Mt Elgon', 'Aberdare Range'], 0, 'Mount Kenya is the highest at 5,199 meters.'),
((SELECT id FROM quiz), 'What is the main threat to Lake Victoria''s ecosystem?', ARRAY['All of the above', 'Water hyacinth', 'Overfishing', 'Pollution'], 0, 'Lake Victoria faces water hyacinth, overfishing, and pollution.'),
((SELECT id FROM quiz), 'Kenya aims to plant how many trees by 2032?', ARRAY['15 billion', '1 billion', '500 million', '10 billion'], 0, 'Kenya targets 15 billion trees by 2032 to combat deforestation.'),
((SELECT id FROM quiz), 'What is the largest national park in Kenya?', ARRAY['Tsavo National Park', 'Maasai Mara', 'Amboseli', 'Nairobi National Park'], 0, 'Tsavo is Kenya''s largest national park, split into East and West.'),
((SELECT id FROM quiz), 'What is "catchment area" conservation?', ARRAY['Protecting water source areas', 'Fishing restrictions', 'Forest logging', 'Mining regulation'], 0, 'Catchment conservation protects water tower areas like the Mau Forest.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Climate Action' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'What is the main greenhouse gas from agriculture?', ARRAY['Methane', 'Carbon dioxide', 'Nitrous oxide', 'Ozone'], 0, 'Livestock farming produces significant methane emissions.'),
((SELECT id FROM quiz), 'What is "climate-smart agriculture"?', ARRAY['Farming that adapts to climate change', 'Using more fertilizers', 'Industrial farming', 'Monocropping'], 0, 'Climate-smart agriculture increases resilience to climate impacts.'),
((SELECT id FROM quiz), 'Which energy source is most sustainable for Kenya?', ARRAY['Geothermal', 'Coal', 'Diesel', 'Nuclear'], 0, 'Kenya is a leader in geothermal energy in Africa.'),
((SELECT id FROM quiz), 'What causes the most deforestation in Kenya?', ARRAY['Charcoal burning', 'Logging', 'Agriculture', 'Urbanization'], 0, 'Charcoal production is a major driver of deforestation.'),
((SELECT id FROM quiz), 'What is "carbon sequestration"?', ARRAY['Capturing and storing carbon dioxide', 'Burning fossil fuels', 'Releasing greenhouse gases', 'Measuring air quality'], 0, 'Carbon sequestration captures CO2 from the atmosphere.'),
((SELECT id FROM quiz), 'Which county has the largest wind farm in Kenya?', ARRAY['Turkana', 'Narok', 'Kajiado', 'Meru'], 0, 'The Lake Turkana Wind Power project is Africa''s largest wind farm.');

WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Wildlife & Parks' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Which animal is Kenya''s national symbol?', ARRAY['Lion', 'Elephant', 'Giraffe', 'Rhino'], 0, 'The lion is Kenya''s national animal.'),
((SELECT id FROM quiz), 'What is "The Big Five" in Kenyan tourism?', ARRAY['Lion, elephant, rhino, buffalo, leopard', 'Giraffe, zebra, wildebeest, hyena, cheetah', 'Hippo, crocodile, flamingo, ostrich, monkey', 'All safari animals'], 0, 'The Big Five are lion, elephant, rhino, buffalo, and leopard.'),
((SELECT id FROM quiz), 'Where is the Great Wildebeest Migration?', ARRAY['Maasai Mara', 'Tsavo', 'Amboseli', 'Samburu'], 0, 'The wildebeest migration crosses the Maasai Mara annually.'),
((SELECT id FROM quiz), 'What is Kenya''s only UNESCO World Heritage site among parks?', ARRAY['Lake Turkana National Parks', 'Maasai Mara', 'Mount Kenya', 'Aberdare'], 0, 'Lake Turkana National Parks is a UNESCO World Heritage site.'),
((SELECT id FROM quiz), 'Which sanctuary is known for rhino conservation?', ARRAY['Ol Pejeta Conservancy', 'Nairobi National Park', 'Lake Nakuru', 'Amboseli'], 0, 'Ol Pejeta is East Africa''s largest black rhino sanctuary.');

-- Swahili health quiz
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Afya na Ustawi' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Nini sababu kuu ya malaria nchini Kenya?', ARRAY['Kuumwa na mbu', 'Maji machafu', 'Virusi vya hewa', 'Chakula kilichoharibika'], 0, 'Malaria husababishwa na kuumwa na mbu.'),
((SELECT id FROM quiz), 'Je, unapaswa kunawa mikono mara ngapi?', ARRAY['Mara kwa mara kwa sabuni', 'Mara moja kwa siku', 'Kabla ya chakula tu', 'Mikono ikiwa machafu tu'], 0, 'Kunawa mikono mara kwa mara kunazuia magonjwa.'),
((SELECT id FROM quiz), 'Nini chanjo inayolinda dhidi ya kifua kikuu?', ARRAY['BCG', 'Polio', 'Surua', 'Pepo'], 0, 'Chanjo ya BCG inalinda dhidi ya kifua kikuu.'),
((SELECT id FROM quiz), 'Kipindi gani kinapendekezwa kwa kunyonyesha maziwa ya mama pekee?', ARRAY['Miezi 6', 'Miezi 3', 'Miezi 12', 'Miezi 9'], 0, 'WHO inapendekeza kunyonyesha pekee kwa miezi 6.'),
((SELECT id FROM quiz), 'Nini dalili kuu ya upungufu wa maji mwilini?', ARRAY['Kiu na mkojo wa giza', 'Maumivu ya kichwa', 'Homa', 'Kikohozi'], 0, 'Kiu na mkojo wa giza ni dalili za upungufu wa maji.');

-- Swahili culture quiz
WITH quiz AS (SELECT id FROM quizzes WHERE title = 'Utamaduni na Mila' LIMIT 1)
INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES
((SELECT id FROM quiz), 'Kitenge ni nini?', ARRAY['Nguo ya kitamaduni', 'Chakula', 'Ngoma', 'Nyimbo'], 0, 'Kitenge ni nguo mahiri ya Afrika Mashariki.'),
((SELECT id FROM quiz), 'Ugali hutengenezwa kutokana na nini?', ARRAY['Unga wa mahindi', 'Unga wa ngano', 'Unga wa mchele', 'Unga wa muhogo'], 0, 'Ugali hutengenezwa kwa unga wa mahindi.'),
((SELECT id FROM quiz), '"Nyama Choma" ni nini?', ARRAY['Nyama iliyochomwa', 'Samaki wa kukaanga', 'Mboga za kitoweo', 'Ugali'], 0, 'Nyama Choma ni nyama iliyochomwa moto.'),
((SELECT id FROM quiz), 'Wamaasai wanajulikana kwa ngoma gani?', ARRAY['Adumu', 'Benga', 'Ohangla', 'Isukuti'], 0, 'Adumu ni ngoma ya kuruka ya Wamaasai.'),
((SELECT id FROM quiz), 'Jamii gani huadhimisha "Tero Buru"?', ARRAY['Luo', 'Kikuyu', 'Kalenjin', 'Mijikenda'], 0, 'Tero buru ni sherehe ya mazishi ya Waluo.');
