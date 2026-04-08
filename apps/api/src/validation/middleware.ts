import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema, ZodError } from 'zod'

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    
    if (!result.success) {
      const errors = formatZodError(result.error)
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      })
      return
    }
    
    req.body = result.data
    next()
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    
    if (!result.success) {
      const errors = formatZodError(result.error)
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      })
      return
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = result.data as any
    next()
  }
}

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    
    if (!result.success) {
      const errors = formatZodError(result.error)
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      })
      return
    }
    
    req.params = result.data as Record<string, string>
    next()
  }
}

function formatZodError(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    errors[path || 'general'] = issue.message
  }
  
  return errors
}
