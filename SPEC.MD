# requests
## type
  * select
  * replace
  * report

## format
  * { type: TYPE, ( sender: PID, target: PID, data: OBJECT )? }

# response (event)

## event
  * REPORT_STATE
  * SEND_MESSAGE
  * QUEUE_RECEIVED
  * QUEUE_CONSUMED
  * ACTOR_UPDATED
  * ACTOR_REPLACED
  * RUNTIME_ERROR
  * PROTOCOL_ERROR
