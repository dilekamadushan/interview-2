import express from "express";
import { ApolloServer, gql } from "apollo-server-express";
import { models } from "./db";

const PORT = 4001;

const typeDefs = gql`
  type Ticket {
    id: ID!
    title: String!
    isCompleted: Boolean!
    children: [Ticket]!
  }

  type Query {
    # return a list of all root level (parentless) tickets.
    tickets: [Ticket]!

    # return the ticket with the given id
    ticket(id: ID!): Ticket!
  }

  type Mutation {
    # create a ticket with the given params
    createTicket(title: String!, isCompleted: Boolean): Ticket!

    # update the title of the ticket with the given id
    updateTicket(id: ID!, title: String!): Ticket!

    # update ticket.isCompleted as given
    toggleTicket(id: ID!, isCompleted: Boolean!): Ticket!

    # delete this ticket
    removeTicket(id: ID!): Boolean!

    # every children in childrenIds gets their parent set as parentId
    addChildrenToTicket(parentId: ID!, childrenIds: [ID!]!): Ticket!

    # the ticket with id: childId gets the ticket with id: parentId as its new parent
    setParentOfTicket(parentId: ID!, childId: ID!): Ticket!

    # the ticket with the given id becomes a root level ticket
    removeParentFromTicket(id: ID!): Ticket!
  }
`;

/**
 * TODO: Your task is implementing the resolvers. Go through the README first.
 * TODO: Your resolvers below will need to implement the typedefs given above.
 */

const resolvers = {
  Query: {
    /**
     * We have implemented this first query for you to set up an initial pattern.
     */
    tickets: async (root, args, context) => {
      return models.Ticket.findAll({
        where: {
          parentId: null
        }
      });
    },

    ticket: async (root, { id }) => {
      const ticket = await models.Ticket.findByPk(id);
      if (!ticket) throw new Error(`Ticket with id ${id} not found`);
      return ticket;
    }
  },
  Ticket: {
    children: async (ticket) => {
      return models.Ticket.findAll({
        where: { parentId: ticket.id }
      });
    }
  },
  Mutation: {
    createTicket: async (root, { title, isCompleted = false }) => {
      return models.Ticket.create({ title, isCompleted });
    },

    updateTicket: async (root, { id, title }) => {
      const ticket = await models.Ticket.findByPk(id);
      if (!ticket) throw new Error(`Ticket with id ${id} not found`);
      return ticket.update({ title });
    },

    toggleTicket: async (root, { id, isCompleted }) => {
      const ticket = await models.Ticket.findByPk(id);
      if (!ticket) throw new Error(`Ticket with id ${id} not found`);
      return ticket.update({ isCompleted });
    },

    removeTicket: async (root, { id }) => {
      const ticket = await models.Ticket.findByPk(id);
      if (!ticket) throw new Error(`Ticket with id ${id} not found`);
      await ticket.destroy();
      return true;
    },

    addChildrenToTicket: async (root, { parentId, childrenIds }) => {
      const parent = await models.Ticket.findByPk(parentId);
      if (!parent) throw new Error(`Ticket with id ${parentId} not found`);
      await models.Ticket.update(
        { parentId },
        { where: { id: childrenIds } }
      );
      return parent;
    },

    setParentOfTicket: async (root, { parentId, childId }) => {
      const child = await models.Ticket.findByPk(childId);
      if (!child) throw new Error(`Ticket with id ${childId} not found`);
      const parent = await models.Ticket.findByPk(parentId);
      if (!parent) throw new Error(`Ticket with id ${parentId} not found`);
      await child.update({ parentId });
      return child;
    }
  };

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.start()
  .then(() => {
    const app = express();
    server.applyMiddleware({ app });
    
    app.listen({ port: PORT }, () => {
      console.log(`Server ready at: http://localhost:${PORT}${server.graphqlPath}`);
    });
  })
  ;
