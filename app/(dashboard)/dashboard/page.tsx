// import { getUserInfo } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getUserBySessionAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function page() {
  const user = await getUserBySessionAuth()
  // const userInfo = await getUserInfo(user.id)
  console.log(user)

  if (!user.onboarded) redirect('/onboarding')

  const program = user.program

  if (!program) {
    return <p>Aucun programme trouvé pour cet utilisateur.</p>
  }

  return (
    <div className="space-y-6 w-[calc(100%-10px)] flex flex-col items-center">
      <Card className="p-4 shadow-md rounded-2xl w-3/4">
        <h2 className="text-2xl font-bold mb-2">{program.name}</h2>
        <p className="text-muted-foreground">{program.description}</p>
      </Card>
      {program.trainingSessions.map((session) => (
        <Card key={session.id} className="p-4 shadow-sm rounded-2xl w-3/4">
          <h3 className="text-xl font-semibold mb-1">{session.name}</h3>
          <Badge variant="outline" className="mb-2">
            Jour {session.day}
          </Badge>
          <p className="mb-4 text-muted-foreground">{session.description}</p>

          <Separator className="my-4" />
          <div className="space-y-4">
            {session.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="border rounded-xl p-3 bg-muted/10 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{exercise.name}</h4>
                  <Badge variant="secondary">
                    {exercise.sets} x {exercise.reps}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {exercise.description}
                </p>
                <p className="text-sm">Poids : {exercise.weight} kg</p>

                <div className="text-xs mt-2 space-y-1">
                  <p>
                    <span className="font-semibold">Justification :</span>{' '}
                    {exercise.reason}
                  </p>
                  <p className="italic text-muted-foreground">
                    Source : {exercise.sourceBook} - p.{exercise.sourcePage} : «{' '}
                    {exercise.sourceExcerpt} »
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
