import MeiliSearch from 'meilisearch'

const meiliClient = new MeiliSearch(process.env.NEXT_PUBLIC_MEILI_HOST || 'http://localhost:7700', process.env.NEXT_PUBLIC_MEILI_KEY || 'test_key')

export const postsIndex = meiliClient.index('posts')
export const quizzesIndex = meiliClient.index('quizzes')
export const usersIndex = meiliClient.index('users')

export async function initializeSearchIndexes() {
  try {
    await Promise.all([
      postsIndex.updateFilterableAttributes(['author_id', 'county', 'verified', 'created_at']).catch(() => {}),
      postsIndex.updateSearchableAttributes(['title', 'content', 'county']).catch(() => {}),
      postsIndex.updateSortableAttributes(['created_at', 'heshima_score']).catch(() => {}),
    ])
    console.log('Search indexes initialized successfully')
  } catch (error) {
    console.error('Failed to initialize search indexes:', error)
  }
}

export async function indexPost(post: any) {
  try {
    await postsIndex.addDocument({
      id: post.id,
      title: post.title,
      content: post.content.substring(0, 500),
      author_id: post.author_id,
      county: post.county,
      verified: post.verified,
      created_at: post.created_at,
      heshima_score: post.heshima_score || 0,
      type: post.type,
      visibility: post.visibility,
      language: post.language,
      tags: post.tags || [],
    })
  } catch (error) {
    console.error('Failed to index post:', error)
  }
}

export async function indexQuiz(quiz: any) {
  try {
    await quizzesIndex.addDocument({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      author_id: quiz.author_id,
      difficulty: quiz.difficulty,
      question_count: quiz.question_count,
      passing_score: quiz.passing_score,
      created_at: quiz.created_at,
      heshima_score: quiz.heshima_score || 0,
      verified: quiz.verified,
      tags: quiz.tags || [],
      estimated_time: quiz.estimated_time,
    })
  } catch (error) {
    console.error('Failed to index quiz:', error)
  }
}

export async function indexUser(user: any) {
  try {
    await usersIndex.addDocument({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      county: user.county,
      heshima_score: user.heshima_score || 0,
      verified: user.verified,
      expert: user.expert || false,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      last_active: user.last_active,
      post_count: user.post_count || 0,
      quiz_count: user.quiz_count || 0,
      followers_count: user.followers_count || 0,
      following_count: user.following_count || 0,
    })
  } catch (error) {
    console.error('Failed to index user:', error)
  }
}

export async function searchContent(query: string, filters?: any, limit: number = 20) {
  try {
    const searchParams: any = {
      q: query,
      limit,
      sort: ['heshima_score:desc'],
      filter: filters,
    }

    const [postsResults, quizzesResults, usersResults] = await Promise.all([
      postsIndex.search(query, searchParams),
      quizzesIndex.search(query, searchParams),
      usersIndex.search(query, { ...searchParams, limit: 10 }),
    ])

    return {
      posts: postsResults.hits,
      quizzes: quizzesResults.hits,
      users: usersResults.hits.filter(user => user.expert),
      totalHits: postsResults.total + quizzesResults.total + usersResults.total,
    }
  } catch (error) {
    console.error('Search failed:', error)
    return { posts: [], quizzes: [], users: [], totalHits: 0 }
  }
}
