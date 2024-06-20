"use strict";

const stripe = require("stripe")(process.env.STRIPE_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;

    const lineItems = await Promise.all(
      products.map(async (product) => {
        const item = await strapi
          .service("api::product.product")
          .findOne(product.id);

        return {
          price_data: {
            currency: "eur",
            product_data: {
              name: item.title,
            },
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        };
      })
    );
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: `${process.env.CLIENT_URL}/?success=true`,
        cancel_url: `${process.env.CLIENT_URL}?canceled=true`,
        shipping_address_collection: {
          allowed_countries: ["HU", "US"],
        },
        currency: "usd",
        payment_method_types: ["card"],
      });

      await strapi
        .service("api::order.order")
        .create({ data: { stripeId: session.id } });

      return { stripeSesion: session };
    } catch (err) {
      ctx.response.status = 500;
      return err;
    }
  },
}));
